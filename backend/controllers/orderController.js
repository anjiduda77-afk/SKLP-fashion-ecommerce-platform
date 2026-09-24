import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import User from '../models/User.js'
import SellerSettlement from '../models/SellerSettlement.js'
import { ApiError } from '../middleware/errorHandler.js'

const calculateOrderTotals = async (cartItems, coupon) => {
  const { default: Seller } = await import('../models/Seller.js')

  const items = await Promise.all(
    cartItems.map(async (item) => {
      const product = await Product.findById(item.productId).lean()
      if (!product) {
        throw new ApiError(404, 'Product not found in cart')
      }

      let sellerId = item.sellerId || product.sellerId
      let shopNameSnapshot = item.shopName || item.shopNameSnapshot || 'Style Street Official Store'

      if (!sellerId) {
        const creatorSeller = await Seller.findOne({ userId: product.createdBy }).lean()
        if (creatorSeller) {
          sellerId = creatorSeller._id
          shopNameSnapshot = creatorSeller.shopName
        }
      }

      const itemPrice = product.price
      const itemDiscount = product.discount !== undefined ? product.discount : 0
      const unitFinalPrice = itemPrice - (itemPrice * itemDiscount / 100)

      return {
        productId: item.productId,
        sellerId,
        offerId: item.offerId,
        shopNameSnapshot,
        brand: product.brand || item.brand || 'Style Street Fashion',
        name: product.name,
        productName: product.name,
        quantity: item.quantity,
        price: itemPrice,
        unitPrice: itemPrice,
        discount: itemDiscount,
        variant: item.variant || {},
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
  const { shippingAddress, paymentMethod, couponCode, phone, isBuyNow, buyNowItem } = req.body

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

  // Validate phone
  const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : ''
  if (!/^[0-9]{10}$/.test(cleanPhone)) {
    throw new ApiError(400, 'Invalid phone number - please provide a valid 10-digit mobile number')
  }

  let items = []
  let subtotal = 0
  let couponDiscount = 0

  let coupon = null
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true })
    if (!coupon) throw new ApiError(404, 'Coupon not found or inactive')
    if (coupon.endDate && coupon.endDate < new Date()) throw new ApiError(410, 'Coupon expired')
  }

  // ── Mode A: BUY NOW (Isolated single item purchase) ──────────────────────────
  if (isBuyNow && buyNowItem) {
    const { productId, quantity = 1, variant = {}, offerId, cartItemId } = buyNowItem
    if (!productId) throw new ApiError(400, 'Buy Now product ID is required')

    const product = await Product.findById(productId).lean()
    if (!product || product.isActive === false) {
      throw new ApiError(400, 'Product is not available for purchase')
    }

    const availableStock = product.stock !== undefined ? Math.max(0, product.stock - (product.reservedStock || 0)) : 999
    const reqQty = Math.max(1, parseInt(quantity, 10) || 1)
    if (reqQty > availableStock) {
      throw new ApiError(400, `Insufficient stock for ${product.name}. Only ${availableStock} available.`)
    }

    const { default: Seller } = await import('../models/Seller.js')
    let sellerId = product.sellerId
    let shopNameSnapshot = 'Style Street Official Store'
    let itemPrice = product.price
    let itemDiscount = product.discount || 0

    if (offerId && !offerId.toString().startsWith('default_')) {
      const { default: SellerOffer } = await import('../models/SellerOffer.js')
      const offer = await SellerOffer.findById(offerId).populate('sellerId').lean()
      if (offer && offer.isActive) {
        sellerId = offer.sellerId?._id || offer.sellerId
        shopNameSnapshot = offer.sellerId?.shopName || 'Verified Seller'
        itemPrice = offer.price
        itemDiscount = offer.discount || 0
      }
    } else if (!sellerId) {
      const creatorSeller = await Seller.findOne({ userId: product.createdBy }).lean()
      if (creatorSeller) {
        sellerId = creatorSeller._id
        shopNameSnapshot = creatorSeller.shopName
      }
    }

    const unitFinalPrice = itemPrice - (itemPrice * itemDiscount / 100)
    const lineFinal = unitFinalPrice * reqQty

    items = [{
      productId: product._id,
      sellerId,
      offerId: (offerId && !offerId.toString().startsWith('default_')) ? offerId : undefined,
      shopNameSnapshot,
      brand: product.brand || 'Style Street Fashion',
      name: product.name,
      productName: product.name,
      quantity: reqQty,
      price: itemPrice,
      unitPrice: itemPrice,
      discount: itemDiscount,
      variant: variant || {},
      finalPrice: lineFinal,
      images: product.images,
      image: product.images?.[0]?.url || product.thumbnail
    }]

    subtotal = lineFinal

    if (coupon) {
      if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
        throw new ApiError(400, `Minimum purchase of ₹${coupon.minPurchaseAmount} required for coupon ${coupon.code}`)
      }
      if (coupon.discountType === 'percentage') {
        couponDiscount = (subtotal * coupon.discountValue) / 100
        if (coupon.maxDiscountAmount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount)
      } else if (coupon.discountType === 'fixed') {
        couponDiscount = coupon.discountValue
      }
      couponDiscount = Math.min(couponDiscount, subtotal)
    }

    // Atomically reserve stock for Buy Now item
    const reserveRes = await Product.updateOne(
      { _id: product._id, stock: { $gte: reqQty + (product.reservedStock || 0) } },
      { $inc: { reservedStock: reqQty } }
    )
    if (reserveRes.modifiedCount === 0) {
      throw new ApiError(400, `Stock reservation failed for ${product.name}. Please try again.`)
    }
  } else {
    // ── Mode B: FULL CART CHECKOUT ─────────────────────────────────────────────
    const cart = await Cart.findOne({ userId: req.user.id }).lean()
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty')
    }

    // Validate available stock for each item before reservation
    for (const item of cart.items) {
      const prod = await Product.findById(item.productId).lean()
      if (!prod || prod.isActive === false) {
        throw new ApiError(400, `Product "${item.productName || 'in cart'}" is no longer available`)
      }
      const availableStock = prod.stock !== undefined ? Math.max(0, prod.stock - (prod.reservedStock || 0)) : 999
      if (item.quantity > availableStock) {
        throw new ApiError(400, `Insufficient stock for "${prod.name}". Available: ${availableStock}, requested: ${item.quantity}`)
      }
    }

    const calculated = await calculateOrderTotals(cart.items, coupon)
    items = calculated.items
    subtotal = calculated.subtotal
    couponDiscount = calculated.couponDiscount

    // Atomically reserve stock for all items
    for (const item of items) {
      const r = await Product.updateOne(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { reservedStock: item.quantity } }
      )
      if (r.modifiedCount === 0) {
        throw new ApiError(400, `Could not reserve stock for ${item.name}.`)
      }
    }
  }

  const orderNumber = `SKLP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

  // ── Construct Multi-Seller Suborders & Per-Seller Delivery Calculations ────
  const { default: Seller } = await import('../models/Seller.js')
  const { default: DeliveryConfig } = await import('../models/DeliveryConfig.js')
  const { calculateDeliveryBreakdownForSeller } = await import('../utils/deliveryUtils.js')
  const config = await DeliveryConfig.getConfig()

  const sellerGroups = {}
  for (const item of items) {
    const sId = item.sellerId ? item.sellerId.toString() : 'official'
    if (!sellerGroups[sId]) {
      sellerGroups[sId] = {
        sellerId: item.sellerId,
        shopNameSnapshot: item.shopNameSnapshot || 'Style Street Official Store',
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
    let sellerDoc = null

    if (!resolvedSellerId) {
      let officialSeller = await Seller.findOne({ shopSlug: 'sklp-official' })
      if (!officialSeller) {
        officialSeller = await Seller.create({
          userId: user._id,
          shopName: 'Style Street Official Store',
          shopSlug: 'sklp-official',
          rating: 4.9,
          verificationStatus: 'verified',
          sellerStatus: 'active'
        })
      }
      resolvedSellerId = officialSeller._id
      sellerDoc = officialSeller
    } else {
      sellerDoc = await Seller.findById(resolvedSellerId).lean()
    }

    const subSubtotal = group.items.reduce((sum, it) => sum + it.finalPrice, 0)
    const commissionRate = sellerDoc?.commissionRate ?? 5
    const platformCommission = parseFloat(((subSubtotal * commissionRate) / 100).toFixed(2))
    const sellerPayout = parseFloat((subSubtotal - platformCommission).toFixed(2))

    const sellerLocation = sellerDoc?.pickupAddress?.lat && sellerDoc?.pickupAddress?.lng
      ? sellerDoc.pickupAddress
      : sellerDoc?.shopLocation

    const sellerDelivery = await calculateDeliveryBreakdownForSeller(
      shippingAddress,
      sellerLocation,
      config,
      subSubtotal,
      sellerDoc?.deliveryMode || 'PAID_DELIVERY'
    )

    if (sellerDelivery.deliveryUnavailable) {
      throw new ApiError(
        422,
        sellerDelivery.deliveryLabel ||
          `Delivery unavailable to ${shippingAddress.city || shippingAddress.postalCode}: exceeds maximum delivery distance.`
      )
    }

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
        carrier: config.deliveryPartnerEnabled ? 'Partner Express' : 'Style Street Express',
        trackingNumber: `SKLP-SUB-${orderNumber.slice(-6)}-${subIndex}`
      },
      settlementStatus: 'PENDING',
      deliveryMethod: sellerDelivery.deliveryMethod || 'self_delivery',
      deliveryDistanceKm: sellerDelivery.distanceKm,
      deliveryFee: sellerDelivery.deliveryFee,
      deliveryLabel: sellerDelivery.deliveryLabel,
      deliveryUnavailable: sellerDelivery.deliveryUnavailable || false
    })
  }

  // ── Delivery fee summation across suborders ─────────────────────────────────
  const deliveryFee = sellerSuborders.reduce((sum, s) => sum + (s.deliveryFee || 0), 0)
  const validDistances = sellerSuborders.map(s => s.deliveryDistanceKm).filter(d => typeof d === 'number' && !isNaN(d))
  const deliveryDistance = validDistances.length > 0 ? Math.max(...validDistances) : null
  const deliveryLabel = deliveryFee === 0 ? 'Free delivery 🎉' : (sellerSuborders[0]?.deliveryLabel || `Delivery charge: ₹${deliveryFee}`)

  // ── Platform fee on subtotal ────────────────────────────────────────────────
  const platformFee = parseFloat(((subtotal * (config.platformFeePercent ?? 5)) / 100).toFixed(2))

  // ── Final total: subtotal + platformFee + deliveryFee − couponDiscount ──────
  const totalAmount = Math.max(0, parseFloat(
    (subtotal + platformFee + deliveryFee - couponDiscount).toFixed(2)
  ))

  // ── Razorpay Server-side Order Initialization ───────────────────────────────
  let razorpayOrderId = null
  if (paymentMethod === 'razorpay') {
    const { razorpayInstance, isRazorpayConfigured } = await import('../config/razorpay.js')
    if (isRazorpayConfigured()) {
      try {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: Math.round(totalAmount * 100), // paise
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

  const orderMeta = {
    isBuyNow: Boolean(isBuyNow),
    cartItemId: buyNowItem?.cartItemId || null
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
    internalNotes: JSON.stringify(orderMeta),
    statusTimeline: [{ status: 'pending', timestamp: new Date(), notes: 'Order placed successfully' }],
    statusHistory: [{ status: 'pending', updatedAt: new Date(), comment: 'Order placed successfully' }],
  })

  // ── Initialize Seller Settlement records ────────────────────────────────────
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
      holdUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    })
  }

  // ── If COD, UPI, or Card: confirm order, commit stock, and clean cart ────────
  if (paymentMethod === 'cod' || paymentMethod === 'upi' || paymentMethod === 'card') {
    if (paymentMethod === 'upi' || paymentMethod === 'card') {
      order.paymentStatus = 'completed'
      order.status = 'confirmed'
      order.transactionId = `${paymentMethod.toUpperCase()}_TXN_${Date.now()}`
      await order.save()

      try {
        const { default: Payment } = await import('../models/Payment.js')
        await Payment.create({
          orderId: order._id,
          userId: req.user.id,
          amount: totalAmount,
          provider: paymentMethod,
          status: 'PAID',
          gatewayPaymentId: order.transactionId,
          capturedAt: new Date()
        })
      } catch (payErr) {
        console.warn('[Payment] Auto-record note:', payErr.message)
      }
    }

    if (isBuyNow && buyNowItem?.cartItemId) {
      // Remove only this single bought item from cart
      await Cart.updateOne(
        { userId: req.user.id },
        { $pull: { items: { _id: buyNowItem.cartItemId } } }
      )
    } else if (!isBuyNow) {
      // Full cart checkout: clear cart
      await Cart.findOneAndUpdate(
        { userId: req.user.id },
        { items: [], subtotal: 0, totalItems: 0, totalQuantity: 0 }
      )
    }
    // Commit stock for direct payment methods immediately
    for (const it of items) {
      await Product.updateOne(
        { _id: it.productId },
        { $inc: { stock: -it.quantity, reservedStock: -it.quantity } }
      )
    }
  }

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
      platformFeePercent: config?.platformFeePercent ?? 5,
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

  // Release or restore inventory
  if (order.paymentStatus === 'completed') {
    // Restore deducted stock
    for (const item of order.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })
    }
  } else {
    // Release reserved stock
    for (const item of order.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { reservedStock: -item.quantity } })
    }
  }

  order.status = 'cancelled'
  await order.save()

  // Invalidate settlements
  await SellerSettlement.updateMany(
    { orderId: order._id, status: { $in: ['PENDING', 'AVAILABLE'] } },
    { $set: { status: 'CANCELLED', adjustmentReason: 'Order cancelled by user/admin' } }
  )

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
      trackingDetails: order.trackingDetails || { carrier: 'Style Street Express', trackingNumber: 'SS-' + order._id.toString().substring(18).toUpperCase() },
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
