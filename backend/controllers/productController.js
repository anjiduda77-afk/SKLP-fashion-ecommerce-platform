import Product from '../models/Product.js'
import Review from '../models/Review.js'
import { ApiError } from '../middleware/errorHandler.js'

export const getProducts = async (req, res) => {
  const { page = 1, limit = 12, category, gender, priceMin, priceMax, search, sort } = req.query
  const query = { isActive: true }

  if (category) query.category = category
  if (gender) query.gender = gender
  if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) }
  if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) }
  if (search) query.$text = { $search: search }

  const sortOptions = {
    newest: { createdAt: -1 },
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
    rating: { rating: -1 },
  }

  const options = {
    page: Number(page),
    limit: Number(limit),
    sort: sortOptions[sort] || { createdAt: -1 },
    lean: true,
  }

  const products = await Product.paginate(query, options)
  res.status(200).json({ success: true, products })
}

export const getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true }).limit(12).lean()
  res.status(200).json({ success: true, products })
}

export const getTrendingProducts = async (req, res) => {
  const products = await Product.find({ isActive: true, isTrending: true }).limit(12).lean()
  res.status(200).json({ success: true, products })
}

export const searchProducts = async (req, res) => {
  const { q, category, gender, priceMin, priceMax } = req.query
  const query = { isActive: true }

  if (q) {
    query.$text = { $search: q }
  }
  if (category) query.category = category
  if (gender) query.gender = gender
  if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) }
  if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) }

  const products = await Product.find(query).limit(24).lean()
  res.status(200).json({ success: true, products })
}

export const getAIRecommendations = async (req, res) => {
  const products = await Product.find({ isActive: true }).limit(10).lean()
  res.status(200).json({ success: true, recommendations: products })
}

export const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id).lean()
  if (!product) {
    throw new ApiError(404, 'Product not found')
  }
  res.status(200).json({ success: true, product })
}

export const getRelatedProducts = async (req, res) => {
  const currentProduct = await Product.findById(req.params.id).lean()
  if (!currentProduct) {
    throw new ApiError(404, 'Product not found')
  }

  const products = await Product.find({
    _id: { $ne: currentProduct._id },
    category: currentProduct.category,
    gender: currentProduct.gender,
    isActive: true,
  }).limit(8).lean()

  res.status(200).json({ success: true, products })
}

export const getSimilarProducts = async (req, res) => {
  const currentProduct = await Product.findById(req.params.id).lean()
  if (!currentProduct) {
    throw new ApiError(404, 'Product not found')
  }

  const products = await Product.find({
    _id: { $ne: currentProduct._id },
    $or: [
      { tags: { $in: currentProduct.tags } },
      { category: currentProduct.category },
      { gender: currentProduct.gender }
    ],
    isActive: true
  }).limit(8).lean()

  res.status(200).json({ success: true, products })
}

export const getProductReviews = async (req, res) => {
  const reviews = await Review.find({ productId: req.params.id, isApproved: true }).lean()
  res.status(200).json({ success: true, reviews })
}
