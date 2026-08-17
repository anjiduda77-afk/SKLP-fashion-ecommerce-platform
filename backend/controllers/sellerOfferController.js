import SellerOffer from '../models/SellerOffer.js'
import Seller from '../models/Seller.js'
import Product from '../models/Product.js'
import { ApiError } from '../middleware/errorHandler.js'

/**
 * Weighted Recommendation Algorithm
 * Balances: PRICE + QUALITY + RELIABILITY + DELIVERY
 */
const calculateOfferScore = (offer, allOffers) => {
  const seller = offer.sellerId || {}
  const rating = seller.rating || 4.5
  const fulfillmentRate = seller.fulfillmentRate || 95
  const cancellationRate = seller.cancellationRate || 0

  // 1. Price Score (up to 35 pts): Cheapest offer gets 35
  const minPrice = Math.min(...allOffers.map(o => o.price))
  const priceScore = offer.price > 0 ? (minPrice / offer.price) * 35 : 0

  // 2. Rating Score (up to 30 pts)
  const ratingScore = (rating / 5.0) * 30

  // 3. Delivery Speed Score (up to 15 pts): Faster delivery gets higher score
  const deliveryDays = offer.deliveryDays || 4
  const deliveryScore = Math.max(0, 15 - (deliveryDays - 1) * 2.5)

  // 4. Stock Score (up to 10 pts)
  const stockScore = offer.stock > 10 ? 10 : offer.stock > 0 ? 5 : 0

  // 5. Reliability Score (up to 10 pts)
  const reliabilityScore = (fulfillmentRate / 100) * 10 - (cancellationRate / 100) * 5

  return Math.round((priceScore + ratingScore + deliveryScore + stockScore + reliabilityScore) * 10) / 10
}

/**
 * Get all seller offers for a product with recommended seller flag
 */
export const getProductOffers = async (req, res) => {
  const { productId } = req.params

  const product = await Product.findById(productId).lean()
  if (!product) {
    throw new ApiError(404, 'Product not found')
  }

  // Fetch all active offers from active/verified sellers
  const offers = await SellerOffer.find({ productId, isActive: true, stock: { $gt: 0 } })
    .populate({
      path: 'sellerId',
      select: 'shopName shopSlug logo rating reviewCount verificationStatus shippingPolicy returnPolicy fulfillmentRate cancellationRate'
    })
    .lean()

  // If no separate offers exist yet, fall back to product creator as default offer
  if (offers.length === 0) {
    const creatorSeller = await Seller.findOne({ userId: product.createdBy }).lean()
    const defaultOffer = {
      _id: 'default_' + product._id,
      productId: product._id,
      sellerId: creatorSeller || {
        _id: product.createdBy,
        shopName: 'SKLP Official Store',
        shopSlug: 'sklp-official',
        rating: 4.8,
        reviewCount: 120,
        verificationStatus: 'verified'
      },
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      discount: product.discount || 0,
      stock: product.stock,
      deliveryDays: 3,
      freeDelivery: true,
      returnPolicyDays: 7,
      isRecommended: true,
      recommendationScore: 95
    }

    return res.status(200).json({
      success: true,
      productId,
      totalOffers: 1,
      recommendedOffer: defaultOffer,
      otherOffers: []
    })
  }

  // Score all offers
  const scoredOffers = offers.map(offer => ({
    ...offer,
    recommendationScore: calculateOfferScore(offer, offers)
  }))

  // Sort descending by recommendation score
  scoredOffers.sort((a, b) => b.recommendationScore - a.recommendationScore)

  const recommendedOffer = { ...scoredOffers[0], isRecommended: true }
  const otherOffers = scoredOffers.slice(1).map(o => ({ ...o, isRecommended: false }))

  res.status(200).json({
    success: true,
    productId,
    totalOffers: scoredOffers.length,
    recommendedOffer,
    otherOffers
  })
}

/**
 * Seller: Create or update an offer for a catalog product
 */
export const createOrUpdateSellerOffer = async (req, res) => {
  const userId = req.user.id
  const seller = await Seller.findOne({ userId })
  if (!seller) {
    throw new ApiError(403, 'Approved seller account required to create offers')
  }

  if (seller.sellerStatus === 'suspended') {
    throw new ApiError(403, 'Your seller account is currently suspended')
  }

  const {
    productId,
    price,
    originalPrice,
    discount,
    stock,
    sku,
    deliveryDays,
    freeDelivery,
    deliveryCharge,
    returnPolicyDays,
    isActive
  } = req.body

  if (!productId || price === undefined || stock === undefined) {
    throw new ApiError(400, 'Product ID, price, and stock are required')
  }

  const product = await Product.findById(productId)
  if (!product) {
    throw new ApiError(404, 'Catalog product not found')
  }

  let offer = await SellerOffer.findOne({ productId, sellerId: seller._id })

  if (!offer) {
    offer = new SellerOffer({
      productId,
      sellerId: seller._id
    })
  }

  offer.price = parseFloat(price)
  offer.originalPrice = originalPrice ? parseFloat(originalPrice) : parseFloat(price)
  offer.discount = discount !== undefined ? parseFloat(discount) : 0
  offer.stock = parseInt(stock, 10)
  offer.sku = sku || `SKU-${seller.shopSlug.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
  offer.deliveryDays = deliveryDays || seller.shippingPolicy?.defaultDeliveryDays || 3
  offer.freeDelivery = freeDelivery !== undefined ? freeDelivery : false
  offer.deliveryCharge = deliveryCharge || 0
  offer.returnPolicyDays = returnPolicyDays || seller.returnPolicy?.returnPeriodDays || 7
  if (isActive !== undefined) offer.isActive = isActive

  await offer.save()

  res.status(200).json({
    success: true,
    message: 'Seller product offer saved successfully',
    offer
  })
}

/**
 * Seller: Get all offers by this seller
 */
export const getMyOffers = async (req, res) => {
  const userId = req.user.id
  const seller = await Seller.findOne({ userId })
  if (!seller) {
    throw new ApiError(403, 'Seller profile not found')
  }

  const offers = await SellerOffer.find({ sellerId: seller._id })
    .populate('productId', 'name brand category images price stock')
    .sort({ updatedAt: -1 })
    .lean()

  res.status(200).json({
    success: true,
    count: offers.length,
    offers
  })
}
