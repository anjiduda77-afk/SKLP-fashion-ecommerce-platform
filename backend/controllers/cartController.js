import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import { ApiError } from '../middleware/errorHandler.js'

export const getCart = async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.id }).lean()
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [], subtotal: 0, totalItems: 0, totalQuantity: 0 })
  }
  res.status(200).json({ success: true, cart })
}

export const addItemToCart = async (req, res) => {
  const { productId, quantity = 1, variant = {} } = req.body
  const product = await Product.findById(productId).lean()

  if (!product) {
    throw new ApiError(404, 'Product not found')
  }

  let cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] })
  }

  const existingItem = cart.items.find(
    (item) => item.productId.toString() === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
  )

  if (existingItem) {
    existingItem.quantity += quantity
    existingItem.finalPrice = existingItem.price * existingItem.quantity
  } else {
    cart.items.push({
      productId,
      quantity,
      price: product.price,
      discount: product.discount,
      finalPrice: (product.price - (product.price * product.discount / 100)) * quantity,
      variant,
      image: product.images?.[0]?.url || product.thumbnail,
    })
  }

  cart.totalItems = cart.items.length
  cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.finalPrice, 0)
  cart.lastModified = new Date()

  await cart.save()

  res.status(200).json({ success: true, cart })
}

export const updateCartItem = async (req, res) => {
  const { itemId } = req.params
  const { quantity } = req.body

  if (quantity <= 0) {
    return removeCartItem(req, res)
  }

  const cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  const item = cart.items.id(itemId)
  if (!item) {
    throw new ApiError(404, 'Cart item not found')
  }

  item.quantity = quantity
  item.finalPrice = item.price * quantity

  cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.finalPrice, 0)
  cart.lastModified = new Date()

  await cart.save()

  res.status(200).json({ success: true, cart })
}

export const removeCartItem = async (req, res) => {
  const { itemId } = req.params
  const cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  cart.items.id(itemId)?.remove()
  cart.totalItems = cart.items.length
  cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.finalPrice, 0)
  cart.lastModified = new Date()

  await cart.save()

  res.status(200).json({ success: true, cart })
}

export const clearCart = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id })
  if (cart) {
    cart.items = []
    cart.totalItems = 0
    cart.totalQuantity = 0
    cart.subtotal = 0
    cart.lastModified = new Date()
    await cart.save()
  }

  res.status(200).json({ success: true, cart: cart || null })
}

export const applyCoupon = async (req, res) => {
  const { code } = req.body
  const cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  cart.couponCode = code
  cart.couponDiscount = 0
  cart.couponExpiry = null
  await cart.save()

  res.status(200).json({ success: true, message: 'Coupon applied successfully', cart })
}

export const removeCoupon = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  cart.couponCode = undefined
  cart.couponDiscount = 0
  cart.couponExpiry = undefined
  await cart.save()

  res.status(200).json({ success: true, message: 'Coupon removed successfully', cart })
}
