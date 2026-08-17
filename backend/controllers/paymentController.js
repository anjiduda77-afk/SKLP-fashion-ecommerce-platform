import crypto from 'crypto'
import Order from '../models/Order.js'
import Payment from '../models/Payment.js'
import SellerSettlement from '../models/SellerSettlement.js'
import razorpayInstance, { isRazorpayConfigured } from '../config/razorpay.js'
import { ApiError } from '../middleware/errorHandler.js'

/**
 * Verify Razorpay payment signature & confirm order
 */
export const verifyRazorpayPayment = async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

  if (!orderId || !razorpayPaymentId) {
    throw new ApiError(400, 'Order ID and Razorpay payment ID are required')
  }

  const order = await Order.findById(orderId)
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  // ── Cryptographic Signature Verification ──────────────────────────────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (isRazorpayConfigured() && razorpayOrderId && razorpaySignature) {
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (generatedSignature !== razorpaySignature) {
      // Mark payment failed
      await Payment.create({
        orderId: order._id,
        userId: order.userId,
        amount: order.totalAmount,
        provider: 'razorpay',
        status: 'FAILED',
        gatewayOrderId: razorpayOrderId,
        gatewayPaymentId: razorpayPaymentId,
        gatewaySignature: razorpaySignature
      })
      throw new ApiError(400, 'Invalid payment signature. Payment verification failed.')
    }
  } else {
    // In dev / sandbox mock environment
    console.log(`[Payment] Development/Mock verification for Order #${order._id}`)
  }

  // Payment is verified
  order.paymentStatus = 'completed'
  order.status = 'confirmed'
  order.transactionId = razorpayPaymentId
  order.razorpayPaymentId = razorpayPaymentId
  order.razorpayOrderId = razorpayOrderId || order.razorpayOrderId
  order.razorpaySignature = razorpaySignature
  order.paymentDetails = {
    method: 'razorpay',
    timestamp: new Date(),
    signature: razorpaySignature || 'verified'
  }

  order.statusHistory.push({
    status: 'confirmed',
    updatedAt: new Date(),
    comment: `Payment received via Razorpay (Txn: ${razorpayPaymentId})`
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
    gatewayOrderId: razorpayOrderId || order.razorpayOrderId,
    gatewayPaymentId: razorpayPaymentId,
    gatewaySignature: razorpaySignature,
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
    const rawBody = JSON.stringify(req.body)
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
    return res.status(200).json({ success: true, message: 'Unhandled webhook format' })
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

  res.status(200).json({ success: true, message: 'Webhook processed' })
}
