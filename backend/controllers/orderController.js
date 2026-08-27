import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import User from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'

const calculateOrderTotals = async (cart, coupon) => {
  const { default: Seller } = await import('../models/Seller.js')

  const items = await Promise.all(
    cart.items.map(async (item) => {
      const product = await Product.findById(item.productId).lean()
      if (!product) {
        throw new ApiError(404, 'Product not found in cart')
      }

      let sellerId = item.sellerId
      let shopNameSnapshot = item.shopName || 'SKLP Official Store'

      if (!sellerId) {
        const creatorSeller = await Seller.findOne({ userId: product.createdBy }).lean()
        if (creatorSeller) {
          sellerId = creatorSeller._id
          shopNameSnapshot = creatorSeller.shopName
        }
      }

      const itemPrice = item.price || product.price
      const itemDiscount = item.discount !== undefined ? item.discount : (product.discount || 0)
      const unitFinalPrice = itemPrice - (itemPrice * itemDiscount / 100)

      return {
        productId: item.productId,
        sellerId,
        offerId: item.offerId,
        shopNameSnapshot,
        brand: product.brand || item.brand || 'SKLP Fashion',
        name: product.name,
        productName: product.name,
        quantity: item.quantity,
        price: itemPrice,
        unitPrice: itemPrice,
        discount: itemDiscount,
        variant: item.variant,
        finalPrice: unitFinalPrice * item.quantity,
        images: product.images,
        image: product.images?.[0]?.url || product.thumbnail || item.image
      }
    })
  )

  const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0)
  
  let couponDiscount = 0
  if (coupon) {
    if (coupon.discountType === 'percentage') {
      couponDiscount = (subtotal * coupon.discountValue) / 100
      if (coupon.maxDiscountAmount) {
        couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount)
      }
    } else if (coupon.discountType === 'fixed') {
      couponDiscount = coupon.discountValue
    }
    couponDiscount = Math.min(couponDiscount, subtotal)
  }

  const total = subtotal - couponDiscount

  return { items, subtotal, couponDiscount, total }
}

export const getOrders = async (req, res) => {
  const query = { userId: req.user.id }
  if (req.user.role === 'admin') {
    query.userId = { $exists: true }
  }
  const orders = await Order.find(query).sort({ createdAt: -1 }).lean()
  res.status(200).json({ success: true, orders })
}

export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).lean()
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }
  if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'Unauthorized')
  }
  res.status(200).json({ success: true, order })
}

export const createOrder = async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode, phone } = req.body

  // Verify user account status
  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')
  if (user.status === 'suspended' || user.status === 'blocked') throw new ApiError(403, 'Account suspended or blocked. Cannot place orders.')
  if (user.status === 'deleted') throw new ApiError(403, 'Account deleted')

  // Validate shipping address
  if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.postalCode) {
    throw new ApiError(400, 'Invalid shipping address — street, city and postal code are required.')
  }

  // Validate payment method
  const validMethods = ['cod', 'razorpay', 'upi', 'card', 'phonePe', 'phonepe']
  if (!validMethods.includes(paymentMethod)) {
    throw new ApiError(400, 'Invalid payment method')
  }

  // Validate phone (support +91 and spaces/formatting by taking last 10 digits)
  const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : ''
  if (!/^[0-9]{10}$/.test(cleanPhone)) {
    throw new ApiError(400, 'Invalid phone number - please provide a valid 10-digit mobile number')
  }

  const cart = await Cart.findOne({ userId: req.user.id }).lean()
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty')
  }

  let coupon = null
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode, isActive: true })
    if (!coupon) throw new ApiError(404, 'Coupon not found or inactive')
    if (coupon.endDate && coupon.endDate < new Date()) throw new ApiError(410, 'Coupon expired')
  }

  // ── 1. Calculate order item totals ────────────────────────────────────────
  const { items, subtotal, couponDiscount } = await calculateOrderTotals(cart, coupon)

  // ── 2. Server-side delivery fee (NEVER trust client-sent fee) ─────────────
  const { calculateDeliveryBreakdown } = await import('../utils/deliveryUtils.js')
  const delivery = await calculateDeliveryBreakdown(shippingAddress)
  const deliveryFee = delivery.deliveryFee
  const deliveryLabel = delivery.deliveryLabel
  const deliveryDistance = delivery.distanceKm

  // ── 3. Platform fee (5% of subtotal) ──────────────────────────────────────
  const platformFee = parseFloat(((subtotal * delivery.platformFeePercent) / 100).toFixed(2))

  // ── 4. Final total: subtotal + platformFee + deliveryFee − couponDiscount ─
  const totalAmount = Math.max(0, parseFloat(
    (subtotal + platformFee + deliveryFee - couponDiscount).toFixed(2)
  ))

  const orderNumber = `SKLP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

  // ── 5. Construct Multi-Seller Suborders ────────────────────────────────────
  const { default: Seller } = await import('../models/Seller.js')
  const { default: SellerSettlement } = await import('../models/SellerSettlement.js')

  // Group items by sellerId
  const sellerGroups = {}
  for (const item of items) {
    const sId = item.sellerId ? item.sellerId.toString() : 'official'
    if (!sellerGroups[sId]) {
      sellerGroups[sId] = {
        sellerId: item.sellerId,
        shopNameSnapshot: item.shopNameSnapshot || 'SKLP Official Store',
        items: []
      }
    }
    sellerGroups[sId].items.push(item)
  }

  const sellerSuborders = []
  let subIndex = 1

  for (const sKey of Object.keys(sellerGroups)) {
    const group = sellerGroups[sKey]
    let resolvedSellerId = group.sellerId

    if (!resolvedSellerId) {
      // Find or create default official seller record
      let officialSeller = await Seller.findOne({ shopSlug: 'sklp-official' })
      if (!officialSeller) {
        officialSeller = await Seller.create({
          userId: user._id,
          shopName: 'SKLP Official Store',
          shopSlug: 'sklp-official',
          rating: 4.9,
          verificationStatus: 'verified',
          sellerStatus: 'active'
        })
      }
      resolvedSellerId = officialSeller._id
    }

    const subSubtotal = group.items.reduce((sum, it) => sum + it.finalPrice, 0)
    const commissionRate = 5 // 5% marketplace commission
    const platformCommission = parseFloat(((subSubtotal * commissionRate) / 100).toFixed(2))
    const sellerPayout = parseFloat((subSubtotal - platformCommission).toFixed(2))

    sellerSuborders.push({
      suborderId: `SUB_${orderNumber}_${subIndex++}`,
      sellerId: resolvedSellerId,
      shopNameSnapshot: group.shopNameSnapshot,
      items: group.items.map(it => ({
        productId: it.productId,
        productName: it.name,
        brand: it.brand,
        quantity: it.quantity,
        price: it.price,
        finalPrice: it.finalPrice,
        variant: it.variant,
        image: it.image
      })),
      subtotal: subSubtotal,
      commissionRate,
      platformCommission,
      sellerPayout,
      status: 'pending',
      trackingDetails: {
        carrier: 'SKLP Express',
        trackingNumber: `SKLP-SUB-${orderNumber.slice(-6)}-${subIndex}`
      },
      settlementStatus: 'PENDING'
    })
  }

  // ── 6. Razorpay Server-side Order Initialization ──────────────────────────
  let razorpayOrderId = null
  if (paymentMethod === 'razorpay') {
    const { razorpayInstance, isRazorpayConfigured } = await import('../config/razorpay.js')
    if (isRazorpayConfigured()) {
      try {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: Math.round(totalAmount * 100), // in paise
          currency: 'INR',
          receipt: orderNumber,
          notes: {
            userId: req.user.id,
            email: user.email || '',
            phone: phone || ''
          }
        })
        razorpayOrderId = rzpOrder.id
      } catch (err) {
        console.warn('Razorpay live order creation note:', err.message)
        razorpayOrderId = `order_rzp_${Date.now()}`
      }
    } else {
      razorpayOrderId = `order_rzp_mock_${Date.now()}`
    }
  }

  const order = await Order.create({
    orderNumber,
    userId: req.user.id,
    items,
    sellerSuborders,
    shippingAddress,
    paymentMethod,
    paymentStatus: 'pending',
    razorpayOrderId,
    couponCode: coupon?.code,
    couponDiscount,
    discountAmount: couponDiscount,
    subtotal,
    platformFee,
    deliveryFee,
    deliveryLabel,
    deliveryDistance,
    shippingCharge: deliveryFee,
    totalAmount,
    total: totalAmount,
    status: 'pending',
    phone,
    statusTimeline: [{ status: 'pending', timestamp: new Date(), notes: 'Order placed successfully' }],
    statusHistory: [{ status: 'pending', updatedAt: new Date(), comment: 'Order placed successfully' }],
  })

  // ── 7. Initialize Seller Settlement records (7-day post-delivery hold) ────
  for (const sub of sellerSuborders) {
    await SellerSettlement.create({
      sellerId: sub.sellerId,
      suborderId: sub.suborderId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      eligibleAmount: sub.subtotal,
      commissionRate: sub.commissionRate,
      platformCommission: sub.platformCommission,
      sellerPayout: sub.sellerPayout,
      status: 'PENDING',
      holdUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Default 14 days or 7 days post-delivery
    })
  }

  await Cart.findOneAndUpdate(
    { userId: req.user.id },
    { items: [], subtotal: 0, totalItems: 0, totalQuantity: 0 }
  )

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    order,
    razorpayOrderId,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || null,
    currency: 'INR',
    breakdown: {
      subtotal,
      platformFee,
      platformFeePercent: delivery.platformFeePercent,
      deliveryFee,
      deliveryLabel,
      deliveryDistance,
      couponDiscount,
      totalAmount
    }
  })
}


export const updateOrderStatus = async (req, res) => {
  const { status } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }
  order.status = status
  await order.save()
  res.status(200).json({ success: true, order })
}

export const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }
  if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'Unauthorized')
  }
  if (order.status === 'delivered') {
    throw new ApiError(400, 'Delivered orders cannot be cancelled')
  }
  order.status = 'cancelled'
  await order.save()
  res.status(200).json({ success: true, order })
}

export const requestReturn = async (req, res) => {
  const { reason } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }
  if (order.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'Unauthorized')
  }
  order.returnRequested = true
  order.returnReason = reason
  order.status = 'return_requested'
  await order.save()
  res.status(200).json({ success: true, order })
}

export const trackOrder = async (req, res) => {
  const order = await Order.findById(req.params.id).lean()
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }
  if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'Unauthorized')
  }
  res.status(200).json({
    success: true,
    tracking: {
      orderId: order._id,
      status: order.status,
      shippingAddress: order.shippingAddress,
      trackingDetails: order.trackingDetails || { carrier: 'SKLP Express', trackingNumber: 'SKLP-' + order._id.toString().substring(18).toUpperCase() },
      statusHistory: order.statusHistory || [
        { status: 'pending', updatedAt: order.createdAt, comment: 'Order placed successfully' }
      ]
    }
  })
}

export const getReturnStatus = async (req, res) => {
  const order = await Order.findById(req.params.id).lean()
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }
  if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'Unauthorized')
  }
  res.status(200).json({
    success: true,
    returnStatus: {
      orderId: order._id,
      status: order.status,
      returnRequested: order.returnRequested || false,
      returnReason: order.returnReason || '',
      updatedAt: order.updatedAt
    }
  })
}
