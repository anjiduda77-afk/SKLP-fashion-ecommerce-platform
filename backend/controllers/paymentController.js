import crypto from 'crypto'
import Order from '../models/Order.js'
import Payment from '../models/Payment.js'
import SellerSettlement from '../models/SellerSettlement.js'
import { getRazorpayInstance, isRazorpayConfigured } from '../config/razorpay.js'
import { ApiError } from '../middleware/errorHandler.js'

/**
 * Verify Razorpay payment signature & confirm order
 */
export const verifyRazorpayPayment = async (req, res) => {
  const { 
    orderId, 
    order_id,
    razorpayOrderId, 
    razorpay_order_id,
    razorpayPaymentId, 
    razorpay_payment_id,
    paymentId,
    razorpaySignature,
    razorpay_signature,
    signature
  } = req.body

  const finalOrderId = orderId || order_id
  const finalPaymentId = razorpayPaymentId || razorpay_payment_id || paymentId
  const finalRazorpayOrderId = razorpayOrderId || razorpay_order_id
  const finalSignature = razorpaySignature || razorpay_signature || signature

  if (!finalOrderId || !finalPaymentId) {
    throw new ApiError(400, 'Order ID and Razorpay Payment ID are required for verification')
  }

  const order = await Order.findById(finalOrderId)
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  // ── Cryptographic Signature Verification ──────────────────────────────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  const effectiveRzpOrderId = finalRazorpayOrderId || order.razorpayOrderId

  if (isRazorpayConfigured() && effectiveRzpOrderId && finalSignature && keySecret) {
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${effectiveRzpOrderId}|${finalPaymentId}`)
      .digest('hex')

    if (generatedSignature !== finalSignature) {
      // Record payment failure audit
      await Payment.create({
        orderId: order._id,
        userId: order.userId,
        amount: order.totalAmount,
        provider: 'razorpay',
        status: 'FAILED',
        gatewayOrderId: effectiveRzpOrderId,
        gatewayPaymentId: finalPaymentId,
        gatewaySignature: finalSignature,
        failureReason: 'Cryptographic signature mismatch'
      })
      throw new ApiError(400, 'Invalid payment signature. Payment verification failed.')
    }
  } else {
    // Development / mock verification mode
    console.log(`[Payment] Verified in development/sandbox mode for Order #${order._id}`)
  }

  // Update order status
  order.paymentStatus = 'completed'
  order.status = 'confirmed'
  order.transactionId = finalPaymentId
  order.razorpayPaymentId = finalPaymentId
  order.razorpayOrderId = effectiveRzpOrderId
  order.razorpaySignature = finalSignature || 'verified'
  order.paymentDetails = {
    method: 'razorpay',
    timestamp: new Date(),
    paymentId: finalPaymentId,
    signature: finalSignature || 'verified'
  }

  order.statusHistory = order.statusHistory || []
  order.statusHistory.push({
    status: 'confirmed',
    updatedAt: new Date(),
    comment: `Payment received via Razorpay (Txn: ${finalPaymentId})`
  })

  // Update seller suborders status
  if (order.sellerSuborders && order.sellerSuborders.length > 0) {
    order.sellerSuborders.forEach(sub => {
      if (sub.status === 'pending') sub.status = 'confirmed'
    })
  }

  await order.save()

  // Record completed payment
  await Payment.create({
    orderId: order._id,
    userId: order.userId,
    amount: order.totalAmount,
    provider: 'razorpay',
    status: 'PAID',
    gatewayOrderId: effectiveRzpOrderId,
    gatewayPaymentId: finalPaymentId,
    gatewaySignature: finalSignature,
    capturedAt: new Date()
  })

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully! Order is confirmed. 🎉',
    order
  })
}

/**
 * Razorpay Webhook Handler (Idempotent)
 */
export const handleRazorpayWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  const signature = req.headers['x-razorpay-signature']

  if (webhookSecret && signature) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
    }
  }

  const event = req.body?.event
  const payload = req.body?.payload?.payment?.entity

  if (!event || !payload) {
    return res.status(200).json({ success: true, message: 'Unhandled webhook event' })
  }

  console.log(`[Razorpay Webhook] Received event: ${event} for payment ${payload.id}`)

  if (event === 'payment.captured' || event === 'order.paid') {
    const orderId = payload.notes?.orderId || payload.receipt
    if (orderId) {
      const order = await Order.findById(orderId)
      if (order && order.paymentStatus !== 'completed') {
        order.paymentStatus = 'completed'
        order.status = 'confirmed'
        order.transactionId = payload.id
        order.razorpayPaymentId = payload.id
        await order.save()
      }
    }
  } else if (event === 'payment.failed') {
    const orderId = payload.notes?.orderId || payload.receipt
    if (orderId) {
      const order = await Order.findById(orderId)
      if (order) {
        order.paymentStatus = 'failed'
        await order.save()
      }
    }
  }

  res.status(200).json({ success: true, message: 'Webhook processed successfully' })
}
