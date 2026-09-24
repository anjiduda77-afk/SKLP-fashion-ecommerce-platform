import mongoose from 'mongoose'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import Wishlist from '../models/Wishlist.js'
import { ApiError } from '../middleware/errorHandler.js'

// Standardized deep population options for Cart items
export const CART_POPULATE_OPTIONS = [
  {
    path: 'items.productId',
    select: 'name price discountedPrice originalPrice discount isActive stock reservedStock sku category brand shortDescription description images thumbnail variants attributes returnPolicy warrantyPeriod sellerId'
  },
  {
    path: 'items.sellerId',
    select: 'shopName brandName deliveryMode pickupAddress shopLocation'
  }
]

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
      cart.subtotal < (coupon.minPurchaseAmount || 0)
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
  let cart = await Cart.findOne({ userId: req.user.id }).populate(CART_POPULATE_OPTIONS)
  if (!cart) {
    try {
      cart = await Cart.create({ userId: req.user.id, items: [], subtotal: 0, totalItems: 0, totalQuantity: 0 })
    } catch (err) {
      if (err.code === 11000) {
        cart = await Cart.findOne({ userId: req.user.id }).populate(CART_POPULATE_OPTIONS)
      } else {
        throw err
      }
    }
  }
  
  if (cart) {
    // Validate products still exist and are in stock
    let modified = false
    const validatedItems = cart.items.filter(item => {
      const product = item.productId
      if (!product || product.isActive === false) {
        modified = true
        return false
      }
      const availableStock = product.stock !== undefined ? Math.max(0, product.stock - (product.reservedStock || 0)) : 999
      if (item.quantity > availableStock) {
        item.quantity = Math.max(1, availableStock)
        modified = true
      }
      return item.quantity > 0
    })

    if (modified) {
      cart.items = validatedItems.map(item => ({
        ...item.toObject(),
        productId: item.productId._id || item.productId,
        sellerId: item.sellerId?._id || item.sellerId
      }))
    }

    await recalculateCart(cart)
    await cart.save()
    await cart.populate(CART_POPULATE_OPTIONS)
  }
  
  res.status(200).json({ success: true, cart })
}

export const addItemToCart = async (req, res) => {
  const { productId, offerId, quantity = 1, variant = {} } = req.body
  const product = await Product.findById(productId).lean()

  if (!product) {
    throw new ApiError(404, 'Product not found')
  }

  if (product.isActive === false) {
    throw new ApiError(400, 'This product is currently inactive')
  }

  const availableStock = product.stock !== undefined ? Math.max(0, product.stock - (product.reservedStock || 0)) : 999
  const qty = parseInt(quantity, 10)
  if (isNaN(qty) || qty < 1) {
    throw new ApiError(400, 'Quantity must be at least 1')
  }

  let cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] })
  }

  let sellerId = product.sellerId || null
  let shopName = 'Style Street Official Store'
  let itemPrice = product.price
  let itemDiscount = product.discount || 0

  // Resolve Seller Offer if specified
  if (offerId && !offerId.toString().startsWith('default_')) {
    const { default: SellerOffer } = await import('../models/SellerOffer.js')
    const offer = await SellerOffer.findById(offerId).populate('sellerId').lean()
    if (offer && offer.isActive) {
      sellerId = offer.sellerId?._id || offer.sellerId
      shopName = offer.sellerId?.shopName || 'Verified Seller'
      itemPrice = offer.price
      itemDiscount = offer.discount || 0
    }
  } else {
    // Default to creator or official seller
    const { default: Seller } = await import('../models/Seller.js')
    const creatorSeller = await Seller.findOne({ userId: product.createdBy }).lean()
    if (creatorSeller) {
      sellerId = creatorSeller._id
      shopName = creatorSeller.shopName
    }
  }

  const unitFinalPrice = itemPrice - (itemPrice * itemDiscount / 100)

  const existingItem = cart.items.find(
    (item) => item.productId.toString() === productId && 
      (!offerId || item.offerId?.toString() === offerId.toString()) &&
      JSON.stringify(item.variant) === JSON.stringify(variant)
  )

  if (existingItem) {
    const newQty = existingItem.quantity + qty
    if (newQty > availableStock) {
      throw new ApiError(400, `Cannot add more than available stock (${availableStock} items available)`)
    }
    existingItem.quantity = newQty
    existingItem.finalPrice = unitFinalPrice * existingItem.quantity
  } else {
    if (qty > availableStock) {
      throw new ApiError(400, `Requested quantity exceeds available stock (${availableStock} items available)`)
    }
    cart.items.push({
      productId,
      sellerId,
      offerId: (offerId && !offerId.toString().startsWith('default_')) ? offerId : undefined,
      shopName,
      brand: product.brand || 'Style Street Fashion',
      productName: product.name,
      quantity: qty,
      price: itemPrice,
      discount: itemDiscount,
      finalPrice: unitFinalPrice * qty,
      variant,
      image: product.images?.[0]?.url || product.thumbnail,
    })
  }

  await recalculateCart(cart)
  await cart.save()
  await cart.populate(CART_POPULATE_OPTIONS)

  res.status(200).json({ success: true, cart })
}

export const updateCartItem = async (req, res) => {
  const { itemId } = req.params
  const { quantity } = req.body

  const qty = parseInt(quantity, 10)
  if (isNaN(qty) || qty <= 0) {
    return removeCartItem(req, res)
  }

  if (Number(quantity) !== qty) {
    throw new ApiError(400, 'Quantity must be an integer')
  }

  const cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  const item = cart.items.id(itemId)
  if (!item) {
    throw new ApiError(404, 'Cart item not found')
  }

  const product = await Product.findById(item.productId).lean()
  if (!product || product.isActive === false) {
    cart.items.pull(itemId)
    await recalculateCart(cart)
    await cart.save()
    throw new ApiError(400, 'This product is no longer available')
  }

  const availableStock = product.stock !== undefined ? Math.max(0, product.stock - (product.reservedStock || 0)) : 999
  if (qty > availableStock) {
    throw new ApiError(400, `Cannot exceed available stock (${availableStock} items available)`)
  }

  item.quantity = qty
  const discountPercent = item.discount || 0
  item.finalPrice = (item.price - (item.price * discountPercent / 100)) * qty

  await recalculateCart(cart)
  await cart.save()
  await cart.populate(CART_POPULATE_OPTIONS)

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
  await cart.populate(CART_POPULATE_OPTIONS)

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

  if (!code || typeof code !== 'string') {
    throw new ApiError(400, 'Coupon code is required')
  }

  const cleanCode = code.trim().toUpperCase()
  const coupon = await Coupon.findOne({ code: cleanCode, isActive: true })
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found or inactive')
  }

  const now = new Date()
  if (coupon.startDate && coupon.startDate > now) {
    throw new ApiError(400, 'Coupon is not active yet')
  }

  if (coupon.endDate && coupon.endDate < now) {
    throw new ApiError(410, 'Coupon has expired')
  }

  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    throw new ApiError(400, 'Coupon usage limit has been reached')
  }

  if (coupon.maxUsesPerUser && Array.isArray(coupon.usedBy)) {
    const userUsage = coupon.usedBy.filter(u => u.userId?.toString() === req.user.id).length
    if (userUsage >= coupon.maxUsesPerUser) {
      throw new ApiError(400, `You have already used this coupon the maximum allowed times (${coupon.maxUsesPerUser})`)
    }
  }

  if (cart.subtotal < (coupon.minPurchaseAmount || 0)) {
    throw new ApiError(400, `Minimum purchase of ₹${coupon.minPurchaseAmount} required to use this coupon`)
  }

  cart.couponCode = coupon.code
  await recalculateCart(cart)
  await cart.save()
  await cart.populate(CART_POPULATE_OPTIONS)

  res.status(200).json({
    success: true,
    message: `Coupon "${coupon.code}" applied successfully!`,
    cart,
    discountAmount: cart.couponDiscount,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description
    }
  })
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
  await cart.populate(CART_POPULATE_OPTIONS)

  res.status(200).json({ success: true, message: 'Coupon removed successfully', cart })
}

// ──────────────────────────────────────────────────────────────────────────────
// GET AVAILABLE COUPONS — Active coupons valid for current customer
// ──────────────────────────────────────────────────────────────────────────────
export const getAvailableCoupons = async (req, res) => {
  const now = new Date()
  const allActiveCoupons = await Coupon.find({
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] }
    ]
  }).lean()

  const userId = req.user?.id ? req.user.id.toString() : null

  const availableCoupons = allActiveCoupons.filter(coupon => {
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return false
    if (userId && coupon.maxUsesPerUser && Array.isArray(coupon.usedBy)) {
      const userUsageCount = coupon.usedBy.filter(u => u.userId?.toString() === userId).length
      if (userUsageCount >= coupon.maxUsesPerUser) return false
    }
    return true
  }).map(c => ({
    _id: c._id,
    code: c.code,
    description: c.description || (c.discountType === 'percentage' ? `Flat ${c.discountValue}% OFF` : `Save flat ₹${c.discountValue}`),
    discountType: c.discountType,
    discountValue: c.discountValue,
    minPurchaseAmount: c.minPurchaseAmount || 0,
    maxDiscountAmount: c.maxDiscountAmount || null,
    endDate: c.endDate
  }))

  res.status(200).json({ success: true, coupons: availableCoupons })
}

// ──────────────────────────────────────────────────────────────────────────────
// MOVE TO WISHLIST — Atomically move a cart item to authenticated user's wishlist
// ──────────────────────────────────────────────────────────────────────────────
export const moveToWishlist = async (req, res) => {
  const { itemId } = req.params
  const cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  const item = cart.items.id(itemId)
  if (!item) {
    throw new ApiError(404, 'Cart item not found')
  }

  const productId = item.productId

  // Find or create user Wishlist
  let wishlist = await Wishlist.findOne({ userId: req.user.id })
  if (!wishlist) {
    try {
      wishlist = await Wishlist.create({ userId: req.user.id, items: [], totalItems: 0 })
    } catch (wErr) {
      if (wErr.code === 11000) {
        wishlist = await Wishlist.findOne({ userId: req.user.id })
      } else {
        throw wErr
      }
    }
  }

  const alreadyInWishlist = (wishlist.items || []).some(
    w => w.productId && w.productId.toString() === productId.toString()
  )

  if (!alreadyInWishlist) {
    const product = await Product.findById(productId).lean()
    wishlist.items.push({
      _id: new mongoose.Types.ObjectId(),
      productId,
      priceAtAdd: product?.price || item.price,
      addedAt: new Date()
    })
    wishlist.totalItems = wishlist.items.length
    await wishlist.save()
  }

  // Remove from cart
  cart.items.pull(itemId)
  await recalculateCart(cart)
  await cart.save()
  await cart.populate(CART_POPULATE_OPTIONS)

  res.status(200).json({
    success: true,
    message: 'Item moved to wishlist successfully ❤️',
    cart
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// MERGE CART — Safely merge guest (localStorage) cart into authenticated user's DB cart
// ──────────────────────────────────────────────────────────────────────────────
export const mergeCart = async (req, res) => {
  const { items: guestItems } = req.body

  if (!guestItems || !Array.isArray(guestItems) || guestItems.length === 0) {
    let cart = await Cart.findOne({ userId: req.user.id }).populate(CART_POPULATE_OPTIONS)
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [], subtotal: 0, totalItems: 0, totalQuantity: 0 })
    }
    return res.status(200).json({ success: true, cart, merged: false })
  }

  let cart = await Cart.findOne({ userId: req.user.id })
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] })
  }

  let mergedCount = 0

  for (const guestItem of guestItems) {
    const { productId, quantity = 1, variant = {} } = guestItem
    if (!productId) continue

    const product = await Product.findById(productId).lean()
    if (!product || product.isActive === false) continue

    const availableStock = product.stock !== undefined ? Math.max(0, product.stock - (product.reservedStock || 0)) : 999
    const qty = Math.min(Math.max(1, parseInt(quantity, 10) || 1), availableStock)

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId.toString() && JSON.stringify(item.variant || {}) === JSON.stringify(variant || {})
    )

    const discountPercent = product.discount || 0
    const unitFinalPrice = product.price - (product.price * discountPercent / 100)

    if (existingItem) {
      existingItem.quantity = Math.min(Math.max(existingItem.quantity, qty), availableStock)
      existingItem.finalPrice = unitFinalPrice * existingItem.quantity
    } else {
      cart.items.push({
        productId,
        quantity: qty,
        price: product.price,
        discount: discountPercent,
        finalPrice: unitFinalPrice * qty,
        variant,
        image: product.images?.[0]?.url || product.thumbnail,
      })
      mergedCount++
    }
  }

  await recalculateCart(cart)
  await cart.save()
  await cart.populate(CART_POPULATE_OPTIONS)

  res.status(200).json({
    success: true,
    cart,
    merged: true,
    mergedCount
  })
}
