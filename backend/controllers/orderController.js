import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import { ApiError } from '../middleware/errorHandler.js'

const calculateOrderTotals = async (cart, coupon) => {
  const items = await Promise.all(
    cart.items.map(async (item) => {
      const product = await Product.findById(item.productId).lean()
      if (!product) {
        throw new ApiError(404, 'Product not found in cart')
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        discount: product.discount || 0,
        variant: item.variant,
        finalPrice: (product.price - (product.price * (product.discount || 0) / 100)) * item.quantity,
        name: product.name,
        images: product.images,
      }
    })
  )

  const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0)
  const couponDiscount = coupon ? Math.min(coupon.discountAmount || coupon.discountPercentage || 0, subtotal) : 0
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
  const cart = await Cart.findOne({ userId: req.user.id }).lean()
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty')
  }

  let coupon = null
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode, isActive: true })
    if (!coupon) {
      throw new ApiError(404, 'Coupon not found or inactive')
    }
    if (coupon.expiryDate && coupon.expiryDate < new Date()) {
      throw new ApiError(410, 'Coupon expired')
    }
  }

  const { items, subtotal, couponDiscount, total } = await calculateOrderTotals(cart, coupon)

  const order = await Order.create({
    userId: req.user.id,
    items: items.map(item => ({
      ...item,
      productName: item.name,
    })),
    shippingAddress,
    paymentMethod,
    couponCode: coupon?.code,
    couponDiscount: couponDiscount,
    discountAmount: couponDiscount,
    subtotal,
    total,
    totalAmount: total,
    status: 'pending',
    phone,
    statusTimeline: [{ status: 'pending', timestamp: new Date(), notes: 'Order placed successfully' }],
    statusHistory: [{ status: 'pending', updatedAt: new Date(), comment: 'Order placed successfully' }],
  })

  await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [], subtotal: 0, totalItems: 0, totalQuantity: 0 })

  res.status(201).json({ success: true, message: 'Order created successfully', order })
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
