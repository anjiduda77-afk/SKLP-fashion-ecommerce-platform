import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import { ApiError } from '../middleware/errorHandler.js'

// Helper to recalculate cart totals, validating and applying coupon discounts automatically
const recalculateCart = async (cart) => {
  cart.totalItems = cart.items.length
  cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.finalPrice, 0)

  if (cart.couponCode) {
    const coupon = await Coupon.findOne({ code: cart.couponCode.toUpperCase(), isActive: true })
    if (
      !coupon ||
      (coupon.startDate && coupon.startDate > new Date()) ||
      (coupon.endDate && coupon.endDate < new Date()) ||
      cart.subtotal < coupon.minPurchaseAmount
    ) {
      // Auto-invalidate coupon if it no longer meets constraints
      cart.couponCode = undefined
      cart.couponDiscount = 0
      cart.couponExpiry = undefined
    } else {
      // Recalculate discount
      let discount = 0
      if (coupon.discountType === 'percentage') {
        discount = (cart.subtotal * coupon.discountValue) / 100
        if (coupon.maxDiscountAmount) {
          discount = Math.min(discount, coupon.maxDiscountAmount)
        }
      } else if (coupon.discountType === 'fixed') {
        discount = coupon.discountValue
      }
      cart.couponDiscount = Math.min(discount, cart.subtotal)
    }
  } else {
    cart.couponDiscount = 0
  }

  cart.lastModified = new Date()
}

export const getCart = async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId')
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [], subtotal: 0, totalItems: 0, totalQuantity: 0 })
  } else {
    // Validate products still exist and are in stock
    let modified = false
    const validatedItems = cart.items.filter(item => {
      const product = item.productId
      if (!product || product.isActive === false) {
        modified = true
        return false
      }
      if (product.stock !== undefined && item.quantity > product.stock) {
        item.quantity = Math.max(0, product.stock)
        modified = true
      }
      return item.quantity > 0
    })

    if (modified) {
      // Re-map the populated productId back to just the ID before saving to avoid schema errors
      // or we can just let mongoose handle it since we modified the document array.
      // Actually mongoose might struggle with populated docs being saved back directly if modified.
      // A safer approach:
      cart.items = validatedItems.map(item => ({
        ...item.toObject(),
        productId: item.productId._id
      }))
    }

    await recalculateCart(cart)
    await cart.save()
  }
  
  // Need to populate it again for the frontend if we unpopulated it
  await cart.populate('items.productId', 'name price discountedPrice isActive stock')
  
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

  const discountPercent = product.discount || 0
  const unitFinalPrice = product.price - (product.price * discountPercent / 100)

  if (existingItem) {
    existingItem.quantity += quantity
    existingItem.finalPrice = unitFinalPrice * existingItem.quantity
  } else {
    cart.items.push({
      productId,
      quantity,
      price: product.price,
      discount: discountPercent,
      finalPrice: unitFinalPrice * quantity,
      variant,
      image: product.images?.[0]?.url || product.thumbnail,
    })
  }

  await recalculateCart(cart)
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
  const discountPercent = item.discount || 0
  item.finalPrice = (item.price - (item.price * discountPercent / 100)) * quantity

  await recalculateCart(cart)
  await cart.save()

  res.status(200).json({ success: true, cart })
}

export const removeCartItem = async (req, res) => {
  const { itemId } = req.params
  const cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  cart.items.pull(itemId)
  
  await recalculateCart(cart)
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
    cart.couponCode = undefined
    cart.couponDiscount = 0
    cart.couponExpiry = undefined
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

  if (!code) {
    throw new ApiError(400, 'Coupon code is required')
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true })
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found or inactive')
  }

  if (coupon.startDate && coupon.startDate > new Date()) {
    throw new ApiError(400, 'Coupon is not active yet')
  }

  if (coupon.endDate && coupon.endDate < new Date()) {
    throw new ApiError(410, 'Coupon has expired')
  }

  if (cart.subtotal < coupon.minPurchaseAmount) {
    throw new ApiError(400, `Minimum purchase of ₹${coupon.minPurchaseAmount} required to use this coupon`)
  }

  cart.couponCode = coupon.code
  await recalculateCart(cart)
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
  cart.lastModified = new Date()
  await cart.save()

  res.status(200).json({ success: true, message: 'Coupon removed successfully', cart })
}
