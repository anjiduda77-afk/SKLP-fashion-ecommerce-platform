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
  let validProducts = offers
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

  if (category) {
    validProducts = validProducts.filter(p => p.category?.toLowerCase() === category.toLowerCase())
  }
  if (sort === 'price-low') {
    validProducts.sort((a, b) => a.price - b.price)
  } else if (sort === 'price-high') {
    validProducts.sort((a, b) => b.price - a.price)
  }

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

/**
 * Get all active and approved shops/brands for marketplace brand selector
 */
export const getAllActiveShops = async (req, res) => {
  const { search } = req.query
  const filter = {
    $or: [
      { approvalStatus: 'APPROVED' },
      { verificationStatus: 'verified' }
    ],
    sellerStatus: 'active'
  }

  if (search && search.trim()) {
    const s = search.trim()
    filter.$and = [
      {
        $or: [
          { brandName: { $regex: s, $options: 'i' } },
          { shopName: { $regex: s, $options: 'i' } },
          { description: { $regex: s, $options: 'i' } }
        ]
      }
    ]
  }

  const sellers = await Seller.find(filter)
    .select('shopName shopSlug brandName brandNameNormalized logo banner description rating reviewCount totalOrders createdAt')
    .sort({ rating: -1, totalOrders: -1 })
    .lean()

  const shopList = await Promise.all(sellers.map(async (s) => {
    const productCount = await Product.countDocuments({
      $or: [{ sellerId: s._id }, { brand: s.brandName || s.shopName }],
      isActive: true
    })
    return {
      _id: s._id,
      id: s._id,
      shopName: s.shopName,
      brandName: s.brandName || s.shopName,
      brandNameNormalized: s.brandNameNormalized,
      shopSlug: s.shopSlug,
      logo: s.logo,
      banner: s.banner,
      description: s.description,
      rating: s.rating,
      reviewCount: s.reviewCount,
      productCount,
      isVerified: true
    }
  }))

  res.status(200).json({
    success: true,
    count: shopList.length,
    shops: shopList
  })
}

