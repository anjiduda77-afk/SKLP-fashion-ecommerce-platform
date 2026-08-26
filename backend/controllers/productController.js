import Product from '../models/Product.js'
import Review from '../models/Review.js'
import { ApiError } from '../middleware/errorHandler.js'

export const getProducts = async (req, res) => {
  const { page = 1, limit = 12, category, gender, priceMin, priceMax, search, sort, tag, offers } = req.query
  const query = { isActive: true }

  if (category) {
    let catArray = typeof category === 'string' ? category.split(',') : (Array.isArray(category) ? category : [category])
    catArray = catArray.map(c => c.trim().toLowerCase())
    if (catArray.includes('footwear') && !catArray.includes('shoes')) catArray.push('shoes')
    if (catArray.includes('shoes') && !catArray.includes('footwear')) catArray.push('footwear')
    query.category = { $in: catArray }
  }

  if (gender) {
    if (typeof gender === 'string') {
      const gArray = gender.split(',').map(g => g.trim().toLowerCase())
      query.gender = { $in: gArray }
    } else if (Array.isArray(gender)) {
      query.gender = { $in: gender }
    }
  }

  if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) }
  if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) }

  if (tag) {
    query.tags = { $in: [new RegExp(tag, 'i')] }
  }

  if (offers === 'true') {
    query.discount = { $gt: 0 }
  }

  if (search) {
    const words = search.trim().split(/\s+/).filter(Boolean)
    if (words.length > 0) {
      query.$and = words.map(word => {
        const searchRegex = new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
        return {
          $or: [
            { name: searchRegex },
            { brand: searchRegex },
            { category: searchRegex },
            { tags: searchRegex },
            { description: searchRegex }
          ]
        }
      })
    }
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    new: { createdAt: -1 },
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
    rating: { rating: -1 },
    trending: { rating: -1, reviewCount: -1 }
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
    const words = q.trim().split(/\s+/).filter(Boolean)
    if (words.length > 0) {
      query.$and = words.map(word => {
        const searchRegex = new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
        return {
          $or: [
            { name: searchRegex },
            { brand: searchRegex },
            { category: searchRegex },
            { tags: searchRegex },
            { description: searchRegex }
          ]
        }
      })
    }
  }
  if (category) {
    if (typeof category === 'string') {
      query.category = category.includes(',') ? { $in: category.split(',') } : category
    } else if (Array.isArray(category)) {
      query.category = { $in: category }
    }
  }
  if (gender) {
    if (typeof gender === 'string') {
      query.gender = gender.includes(',') ? { $in: gender.split(',') } : gender
    } else if (Array.isArray(gender)) {
      query.gender = { $in: gender }
    }
  }
  if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) }
  if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) }

  const products = await Product.find(query).limit(24).lean()
  res.status(200).json({ success: true, products })
}

export const getAIRecommendations = async (req, res) => {
  const products = await Product.find({ isActive: true }).limit(10).lean()
  res.status(200).json({ success: true, recommendations: products })
}

import mongoose from 'mongoose'

const ALIAS_SKU_MAP = {
  m1: 'SKLP-M-BLZ-001',
  m2: 'SKLP-M-HUD-002',
  m3: 'SKLP-M-SHO-003',
  w1: 'SKLP-W-SAR-004',
  w2: 'SKLP-W-COT-005',
  w3: 'SKLP-W-STL-006',
  k1: 'SKLP-K-DNG-007',
  k2: 'SKLP-K-SNK-008',
  f1: 'SKLP-M-BLZ-001',
  f2: 'SKLP-W-SAR-004',
  f3: 'SKLP-M-SHO-003',
  f4: 'SKLP-W-STL-006',
  t1: 'SKLP-M-HUD-002',
  t2: 'SKLP-W-COT-005',
  t3: 'SKLP-K-DNG-007',
  t4: 'SKLP-K-SNK-008'
}

export const resolveProductDocument = async (rawId) => {
  if (!rawId || typeof rawId !== 'string') return null
  const clean = rawId.trim()

  // 1. Try direct ObjectId lookup
  if (mongoose.Types.ObjectId.isValid(clean)) {
    const direct = await Product.findById(clean).lean()
    if (direct) return direct
  }

  // 2. Try Alias Mapping (e.g. m1, w1, k1, f1, t1)
  const mappedSku = ALIAS_SKU_MAP[clean.toLowerCase()]
  if (mappedSku) {
    const bySku = await Product.findOne({ sku: mappedSku }).lean()
    if (bySku) return bySku
  }

  // 3. Try SKU, Slug, or Custom ID
  let product = await Product.findOne({
    $or: [
      { sku: clean },
      { slug: clean },
      { sku: new RegExp(`^${clean}$`, 'i') },
      { slug: new RegExp(`^${clean}$`, 'i') }
    ]
  }).lean()
  if (product) return product

  // 4. Try Name or Gender Matching
  if (clean.toLowerCase().startsWith('m')) {
    product = await Product.findOne({ gender: 'men', isActive: true }).lean()
  } else if (clean.toLowerCase().startsWith('w')) {
    product = await Product.findOne({ gender: 'women', isActive: true }).lean()
  } else if (clean.toLowerCase().startsWith('k')) {
    product = await Product.findOne({ gender: 'kids', isActive: true }).lean()
  }

  if (product) return product

  // 5. Fallback to any active product
  return await Product.findOne({ isActive: true }).lean()
}

export const getProductById = async (req, res) => {
  const product = await resolveProductDocument(req.params.id)
  if (!product) {
    throw new ApiError(404, 'Product not found')
  }
  res.status(200).json({ success: true, product })
}

export const getRelatedProducts = async (req, res) => {
  const currentProduct = await resolveProductDocument(req.params.id)
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
  const currentProduct = await resolveProductDocument(req.params.id)
  if (!currentProduct) {
    throw new ApiError(404, 'Product not found')
  }

  const products = await Product.find({
    _id: { $ne: currentProduct._id },
    $or: [
      { tags: { $in: currentProduct.tags || [] } },
      { category: currentProduct.category },
      { gender: currentProduct.gender }
    ],
    isActive: true
  }).limit(8).lean()

  res.status(200).json({ success: true, products })
}

