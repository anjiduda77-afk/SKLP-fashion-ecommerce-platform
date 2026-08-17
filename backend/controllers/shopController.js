import Seller from '../models/Seller.js'
import SellerOffer from '../models/SellerOffer.js'
import Product from '../models/Product.js'
import { ApiError } from '../middleware/errorHandler.js'

/**
 * Get public shop profile by slug
 */
export const getShopProfile = async (req, res) => {
  const { slug } = req.params

  const seller = await Seller.findOne({ shopSlug: slug.toLowerCase() })
    .select('shopName shopSlug logo banner description businessType rating reviewCount totalOrders verificationStatus sellerStatus shippingPolicy returnPolicy createdAt')
    .lean()

  if (!seller) {
    throw new ApiError(404, 'Shop not found')
  }

  // Count active offers / products for this seller
  const totalProducts = await SellerOffer.countDocuments({ sellerId: seller._id, isActive: true, stock: { $gt: 0 } })

  res.status(200).json({
    success: true,
    shop: {
      ...seller,
      totalProducts
    }
  })
}

/**
 * Get all products / offers available from this shop
 */
export const getShopProducts = async (req, res) => {
  const { slug } = req.params
  const { category, sort = 'popular', page = 1, limit = 20 } = req.query

  const seller = await Seller.findOne({ shopSlug: slug.toLowerCase() }).lean()
  if (!seller) {
    throw new ApiError(404, 'Shop not found')
  }

  const query = { sellerId: seller._id, isActive: true, stock: { $gt: 0 } }

  const offers = await SellerOffer.find(query)
    .populate({
      path: 'productId',
      select: 'name slug brand category gender images description price rating reviewCount'
    })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean()

  const total = await SellerOffer.countDocuments(query)

  // Filter out any offers whose catalog product was deleted or inactive
  const validProducts = offers
    .filter(o => o.productId)
    .map(o => ({
      offerId: o._id,
      productId: o.productId._id,
      name: o.productId.name,
      slug: o.productId.slug,
      brand: o.productId.brand || 'SKLP Fashion',
      category: o.productId.category,
      gender: o.productId.gender,
      images: o.productId.images,
      price: o.price,
      originalPrice: o.originalPrice,
      discount: o.discount,
      stock: o.stock,
      deliveryDays: o.deliveryDays,
      freeDelivery: o.freeDelivery,
      sellerRating: seller.rating,
      shopName: seller.shopName,
      shopSlug: seller.shopSlug
    }))

  res.status(200).json({
    success: true,
    products: validProducts,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  })
}
