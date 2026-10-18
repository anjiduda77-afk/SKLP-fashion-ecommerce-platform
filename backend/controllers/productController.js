import Product from '../models/Product.js'
import { ApiError } from '../middleware/errorHandler.js'

export const expandCategoryFilter = (category) => {
  if (!category) return null;
  let catArray = typeof category === 'string' ? category.split(',') : (Array.isArray(category) ? category : [category]);
  catArray = catArray.map(c => c.trim().toLowerCase()).filter(c => c && c !== 'all');
  if (catArray.length === 0) return null;

  const expanded = new Set();
  catArray.forEach(c => {
    const dashed = c.replace(/\s+/g, '-');
    expanded.add(c);
    expanded.add(dashed);

    if (dashed === 't-shirts' || c === 't shirts' || c === 'tshirt' || c === 'tshirts' || c === 't-shirt') {
      expanded.add('t-shirts');
      expanded.add('t shirts');
    }
    if (dashed === 'fashion-wear' || c === 'fashion wear' || c === 'fashionwear' || c === 'fashion') {
      expanded.add('fashion-wear');
      expanded.add('fashion wear');
    }
    if (c === 'shoes' || c === 'footwear' || c === 'shoe') {
      expanded.add('shoes');
      expanded.add('footwear');
    }
    if (c === 'sarees' || c === 'saree') {
      expanded.add('sarees');
      expanded.add('saree');
    }
    if (c === 'hoodies' || c === 'hoodie') {
      expanded.add('hoodies');
      expanded.add('hoodie');
    }
    if (c === 'jeans' || c === 'jean') {
      expanded.add('jeans');
      expanded.add('jean');
    }
    if (c === 'shirts' || c === 'shirt') {
      expanded.add('shirts');
      expanded.add('shirt');
    }
    if (c === 'accessories' || c === 'accessory') {
      expanded.add('accessories');
      expanded.add('accessory');
    }
    if (dashed === 'sportswear' || c === 'sportswear' || c === 'sports') {
      expanded.add('fashion-wear');
      expanded.add('hoodies');
      expanded.add('shoes');
      expanded.add('t-shirts');
    }
    if (dashed === 'exclusive-collections' || c === 'exclusive collections' || c === 'exclusive') {
      expanded.add('sarees');
      expanded.add('fashion-wear');
      expanded.add('accessories');
    }
    if (dashed === 'trending-fashion' || c === 'trending fashion' || c === 'trending') {
      expanded.add('t-shirts');
      expanded.add('hoodies');
      expanded.add('jeans');
      expanded.add('shoes');
      expanded.add('fashion-wear');
    }
  });

  return Array.from(expanded);
};

export const expandGenderFilter = (gender) => {
  if (!gender) return null;
  let gArray = typeof gender === 'string' ? gender.split(',') : (Array.isArray(gender) ? gender : [gender]);
  gArray = gArray.map(g => g.trim().toLowerCase()).filter(Boolean);
  if (gArray.length === 0 || gArray.includes('all')) return null;

  const expanded = new Set();
  gArray.forEach(g => {
    expanded.add(g);
    if (['men', 'women', 'kids'].includes(g)) {
      expanded.add('unisex');
      expanded.add('all');
    } else if (g === 'unisex') {
      expanded.add('all');
    }
  });

  return Array.from(expanded);
};

export const getProducts = async (req, res) => {
  const { page = 1, limit = 12, category, gender, priceMin, priceMax, search, sort, tag, offers, brand, sellerId, shopId, subcategory } = req.query
  const query = { isActive: true }

  // Shop / Brand Scoping
  const activeSellerId = sellerId || shopId
  if (activeSellerId) {
    query.sellerId = activeSellerId
  }
  if (brand) {
    const brandList = (typeof brand === 'string' ? brand.split(',') : (Array.isArray(brand) ? brand : [brand]))
      .map(b => b.trim())
      .filter(Boolean)
    if (brandList.length > 0) {
      const brandRegexes = brandList.map(b => new RegExp(`^${b.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'))
      const brandNormalized = brandList.map(b => b.toLowerCase().replace(/[^a-z0-9]/g, ''))
      query.$or = [
        { brand: { $in: brandRegexes } },
        { brandNormalized: { $in: brandNormalized } }
      ]
    }
  }

  const expandedCats = expandCategoryFilter(category)
  if (expandedCats && expandedCats.length > 0) {
    query.category = { $in: expandedCats }
  }

  const expandedGenders = expandGenderFilter(gender)
  if (expandedGenders && expandedGenders.length > 0) {
    query.gender = { $in: expandedGenders }
  }

  if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) }
  if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) }

  if (tag) {
    query.tags = { $in: [new RegExp(tag, 'i')] }
  }

  if (offers === 'true') {
    query.discount = { $gt: 0 }
  }

  if (subcategory && subcategory.toLowerCase() !== 'all') {
    const subClean = subcategory.trim()
    const subRegex = new RegExp(subClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
    const mappedCats = expandCategoryFilter(subClean)
    const orClauses = [
      { subcategory: subRegex },
      { tags: { $in: [subRegex] } },
      { name: subRegex },
      { description: subRegex }
    ]
    if (mappedCats && mappedCats.length > 0) {
      orClauses.push({ category: { $in: mappedCats } })
    }

    if (!query.$and) query.$and = []
    query.$and.push({ $or: orClauses })
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
    select: 'name slug price originalPrice discount images brand brandNormalized rating reviewCount category gender stock isFeatured isTrending tags isOutOfStock'
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

export const getCategories = async (req, res) => {
  const categories = await Product.distinct('category', { isActive: true })
  const defaultCategories = [
    'shirts', 't-shirts', 'jeans', 'sarees', 'hoodies', 'shoes', 'accessories', 'fashion-wear'
  ]
  const combined = Array.from(new Set([...(categories || []), ...defaultCategories])).filter(Boolean)
  res.status(200).json({ success: true, count: combined.length, categories: combined })
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

  const expandedCats = expandCategoryFilter(category)
  if (expandedCats && expandedCats.length > 0) {
    query.category = { $in: expandedCats }
  }

  const expandedGenders = expandGenderFilter(gender)
  if (expandedGenders && expandedGenders.length > 0) {
    query.gender = { $in: expandedGenders }
  }

  if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) }
  if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) }

  const products = await Product.find(query)
    .select('name slug price originalPrice discount images brand brandNormalized rating reviewCount category gender stock isFeatured isTrending tags isOutOfStock')
    .limit(24)
    .lean()
  res.status(200).json({ success: true, products })
}

export const getAIRecommendations = async (req, res) => {
  const products = await Product.find({ isActive: true }).limit(10).lean()
  res.status(200).json({ success: true, recommendations: products })
}
export const getRecommendations = getAIRecommendations

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

