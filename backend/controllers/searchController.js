import Product from '../models/Product.js'
import Seller from '../models/Seller.js'
import Analytics from '../models/Analytics.js'

// ============================================================
// TYPO & SYNONYM DICTIONARY — fashion marketplace terms
// ============================================================
const TYPO_SYNONYMS = {
  // Shirts & Tops
  'shrt': 'shirt', 'shrts': 'shirts', 'shrit': 'shirt', 'shets': 'shirts',
  'tshrt': 't-shirt', 'tshrts': 't-shirts', 'tshrit': 't-shirt', 'tshirts': 't-shirts',
  'tee': 't-shirt', 'tees': 't-shirts', 'tee-shirt': 't-shirt',
  'bluse': 'blouse', 'bloses': 'blouses',
  'kurtha': 'fashion-wear', 'kurta': 'fashion-wear', 'kurti': 'fashion-wear',
  'kurthi': 'fashion-wear', 'kurthas': 'fashion-wear',
  // Bottoms
  'jean': 'jeans', 'jens': 'jeans', 'jeens': 'jeans', 'jins': 'jeans',
  'pant': 'jeans', 'pants': 'jeans', 'trouser': 'jeans', 'trousers': 'jeans',
  'trouzer': 'jeans', 'trouzers': 'jeans',
  // Sarees
  'sari': 'saree', 'saris': 'sarees', 'sarey': 'saree', 'sareys': 'sarees',
  'saery': 'saree', 'cheera': 'saree', 'cheeras': 'sarees',
  // Shoes
  'shoo': 'shoes', 'shooe': 'shoes', 'shoos': 'shoes', 'shoe': 'shoes',
  'shose': 'shoes', 'shoes': 'shoes', 'shos': 'shoes',
  'sneker': 'shoes', 'sneeker': 'shoes', 'sneakers': 'shoes', 'sneaker': 'shoes',
  'boot': 'shoes', 'boots': 'shoes', 'sandal': 'shoes', 'sandals': 'shoes',
  'slipper': 'shoes', 'slippers': 'shoes', 'chappal': 'shoes', 'chappals': 'shoes',
  // Hoodies & Jackets
  'hudie': 'hoodie', 'hudies': 'hoodies', 'hoody': 'hoodie',
  'hoddie': 'hoodie', 'hoodies': 'hoodies',
  'jacket': 'hoodies', 'jackets': 'hoodies', 'sweter': 'hoodies', 'sweater': 'hoodies',
  // Accessories
  'belt': 'accessories', 'belts': 'accessories', 'wallet': 'accessories',
  'wallets': 'accessories', 'bag': 'accessories', 'bags': 'accessories',
  'watch': 'accessories', 'watches': 'accessories', 'watchs': 'accessories',
  'handbag': 'accessories', 'handbags': 'accessories', 'purse': 'accessories',
  // Fashion wear / dresses
  'dress': 'fashion-wear', 'frocks': 'fashion-wear', 'frock': 'fashion-wear',
  'gown': 'fashion-wear', 'gowns': 'fashion-wear', 'lehenga': 'fashion-wear',
  'salwar': 'fashion-wear', 'dupatta': 'fashion-wear', 'anarkali': 'fashion-wear',
  // Brands (common typos)
  'addidas': 'adidas', 'adiddas': 'adidas', 'adidass': 'adidas', 'addidass': 'adidas',
  'adidias': 'adidas', 'adiads': 'adidas',
  'nik': 'nike', 'nikee': 'nike', 'nikie': 'nike', 'nke': 'nike',
  'pumma': 'puma', 'pums': 'puma',
  'levis': "levi's", 'lewy': "levi's", 'lewi': "levi's",
  'reebok': 'reebok', 'rebok': 'reebok', 'ribok': 'reebok',
  'sklp': 'sklp',
  // Colors
  'blak': 'black', 'blck': 'black',
  'whte': 'white', 'wite': 'white',
  'rd': 'red',
  'blu': 'blue', 'bue': 'blue',
  'gren': 'green', 'grn': 'green',
  'yellw': 'yellow', 'yello': 'yellow',
  'brwn': 'brown', 'brwon': 'brown',
  'pnk': 'pink',
  'orng': 'orange', 'ornge': 'orange',
  'purpl': 'purple', 'purle': 'purple',
  // Gender
  'mens': 'men', 'men\'s': 'men', 'male': 'men', 'boys': 'men',
  'womens': 'women', 'women\'s': 'women', 'ladies': 'women', 'female': 'women', 'girls': 'women',
  'kids': 'kids', 'kid': 'kids', 'children': 'kids', 'child': 'kids', 'baby': 'kids',
}

// ============================================================
// KNOWN CATEGORIES (for intent detection)
// ============================================================
const KNOWN_CATEGORIES = ['shirts', 't-shirts', 'jeans', 'sarees', 'hoodies', 'shoes', 'accessories', 'fashion-wear']

// ============================================================
// TRENDING SEARCHES
// ============================================================
const TRENDING_SEARCHES = [
  'Gold Banarasi Silk Saree',
  'Velvet Evening Blazer',
  'Gold Trim Sneakers',
  'Luxe Sport Hoodie',
  'Italian Oxford Boots',
  'Premium Linen Shirt',
  'Soft Denim Jeans',
  'Designer Leather Tote'
]

// ============================================================
// LEVENSHTEIN DISTANCE — fuzzy spelling correction
// ============================================================
function levenshtein(a, b) {
  if (!a || !b) return Math.max((a || '').length, (b || '').length)
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Find best fuzzy match for a word among candidates
 * Returns null if no candidate is close enough
 */
function findFuzzyMatch(word, candidates, maxDistance = 2) {
  const lower = word.toLowerCase()
  let best = null, bestDist = Infinity
  for (const candidate of candidates) {
    const dist = levenshtein(lower, candidate.toLowerCase())
    if (dist < bestDist && dist <= maxDistance) {
      bestDist = dist
      best = candidate
    }
  }
  return best
}

// ============================================================
// NORMALIZE QUERY — trim, collapse spaces, lowercase
// ============================================================
function normalizeQuery(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

// ============================================================
// PARSE NATURAL SEARCH QUERY
// Extracts: price filter, cleans typos, extracts intent
// ============================================================
export const parseNaturalSearchQuery = (rawQuery) => {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return { cleanedQuery: '', priceFilter: null, extractedPriceText: null, intent: {} }
  }

  let text = normalizeQuery(rawQuery)
  let priceFilter = null
  let extractedPriceText = null
  const intent = {}

  // 1. Price range "between X and Y" / "from X to Y"
  const rangeMatch = text.match(/(?:between|from)\s+(\d+)\s+(?:and|to)\s+(\d+)/i)
  if (rangeMatch) {
    const min = Number(rangeMatch[1]), max = Number(rangeMatch[2])
    priceFilter = { $gte: Math.min(min, max), $lte: Math.max(min, max) }
    extractedPriceText = `₹${Math.min(min, max)} – ₹${Math.max(min, max)}`
    text = text.replace(rangeMatch[0], '').trim()
  }

  // 2. "under X" / "below X" / "less than X"
  if (!priceFilter) {
    const underMatch = text.match(/(?:under|below|less\s+than|upto|up\s+to|<=?)\s*₹?\s*(\d+)/i)
    if (underMatch) {
      priceFilter = { $lte: Number(underMatch[1]) }
      extractedPriceText = `Under ₹${Number(underMatch[1]).toLocaleString('en-IN')}`
      text = text.replace(underMatch[0], '').trim()
    }
  }

  // 3. "above X" / "over X" / "more than X"
  if (!priceFilter) {
    const aboveMatch = text.match(/(?:above|over|more\s+than|>=?)\s*₹?\s*(\d+)/i)
    if (aboveMatch) {
      priceFilter = { $gte: Number(aboveMatch[1]) }
      extractedPriceText = `Above ₹${Number(aboveMatch[1]).toLocaleString('en-IN')}`
      text = text.replace(aboveMatch[0], '').trim()
    }
  }

  // 4. Detect gender intent
  const genderMap = { men: 'men', male: 'men', boys: 'men', women: 'women', ladies: 'women', female: 'women', girls: 'women', kids: 'kids', children: 'kids', unisex: 'unisex' }
  for (const [keyword, gender] of Object.entries(genderMap)) {
    const pattern = new RegExp(`\\b${keyword}(?:'?s)?\\b`, 'i')
    if (pattern.test(text)) {
      intent.gender = gender
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // 5. Detect color intent
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'pink', 'purple', 'brown', 'grey', 'gray', 'beige', 'maroon', 'navy', 'gold', 'silver', 'cream']
  for (const color of colors) {
    if (new RegExp(`\\b${color}\\b`, 'i').test(text)) {
      intent.color = color
      break // keep color in query for DB matching, just note intent
    }
  }

  // 6. Word-by-word typo correction
  const words = text.split(/\s+/).filter(Boolean).map(word => {
    const lower = word.toLowerCase()
    // Static dictionary first
    if (TYPO_SYNONYMS[lower]) return TYPO_SYNONYMS[lower]
    // Fuzzy match against category list if word length >= 4
    if (lower.length >= 4) {
      const fuzzyCategory = findFuzzyMatch(lower, KNOWN_CATEGORIES, 2)
      if (fuzzyCategory) return fuzzyCategory
    }
    return word
  })

  return {
    cleanedQuery: words.join(' ').trim(),
    priceFilter,
    extractedPriceText,
    intent
  }
}

// ============================================================
// TRACK SEARCH ANALYTICS — fire-and-forget
// ============================================================
async function trackSearch(query, resultCount, req) {
  try {
    await Analytics.create({
      type: 'search',
      entityType: 'search',
      metadata: {
        searchQuery: query,
        sessionId: req?.headers?.['x-session-id'] || null,
        deviceType: /mobile/i.test(req?.headers?.['user-agent'] || '') ? 'mobile' : 'desktop',
        browser: req?.headers?.['user-agent']?.split(' ')[0] || null,
        ipAddress: req?.ip || null
      },
      customData: { resultCount }
    })
  } catch (_) {
    // Non-blocking — analytics failure never breaks search
  }
}

// ============================================================
// SEARCH SUGGESTIONS — GET /api/search/suggestions
// ============================================================
export const getSearchSuggestions = async (req, res) => {
  const shopId = req.query.shopId || req.query.sellerId
  const q = req.query.q || ''
  const queryStr = q.trim()

  // Empty query → trending + categories
  if (!queryStr) {
    return res.status(200).json({
      success: true,
      query: '',
      cleanedQuery: '',
      priceConstraint: null,
      isShopScoped: !!shopId,
      products: [],
      suggestions: [],
      categories: KNOWN_CATEGORIES,
      brands: [],
      trending: TRENDING_SEARCHES,
      intent: {}
    })
  }

  const { cleanedQuery, priceFilter, extractedPriceText, intent } = parseNaturalSearchQuery(queryStr)

  // Determine corrected query display (only show "did you mean" if meaningfully different)
  const showCorrection = cleanedQuery.toLowerCase() !== queryStr.toLowerCase() &&
    levenshtein(cleanedQuery.toLowerCase(), queryStr.toLowerCase()) >= 2

  // Escape regex special chars
  const safeQuery = cleanedQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const searchRegex = new RegExp(safeQuery, 'i')
  // Also search original query
  const origRegex = new RegExp(queryStr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')

  const baseProductQuery = { isActive: true }
  if (shopId) baseProductQuery.sellerId = shopId
  if (priceFilter) baseProductQuery.price = priceFilter
  if (intent.gender) baseProductQuery.gender = intent.gender

  baseProductQuery.$or = [
    { name: searchRegex },
    { name: origRegex },
    { brand: searchRegex },
    { brand: origRegex },
    { category: searchRegex },
    { tags: searchRegex },
    { nameNormalized: searchRegex },
    { brandNormalized: searchRegex }
  ]

  // Top matching products (fast — select minimal fields)
  const products = await Product.find(baseProductQuery)
    .select('name slug price originalPrice discount images thumbnail brand category sellerId')
    .sort({ rating: -1, purchaseCount: -1 })
    .limit(6)
    .lean()

  // Matching categories
  const matchedCategories = KNOWN_CATEGORIES.filter(cat =>
    cat.toLowerCase().includes(cleanedQuery.toLowerCase()) ||
    cleanedQuery.toLowerCase().includes(cat.replace('-', ' ').toLowerCase()) ||
    findFuzzyMatch(cleanedQuery.toLowerCase(), [cat], 2)
  )

  // Matching brands from Seller collection (real DB data)
  let matchingBrands = []
  if (!shopId) {
    const sellers = await Seller.find({
      $or: [
        { brandName: searchRegex },
        { brandName: origRegex },
        { shopName: searchRegex },
        { shopName: origRegex }
      ],
      approvalStatus: { $in: ['APPROVED', 'verified'] },
      sellerStatus: 'active'
    })
      .select('shopName brandName logo rating shopSlug')
      .limit(4)
      .lean()

    matchingBrands = sellers.map(s => ({
      id: s._id,
      name: s.brandName || s.shopName,
      slug: s.shopSlug,
      logo: s.logo?.url || null,
      rating: s.rating
    }))
  }

  // Build quick suggestion strings
  const suggestions = [
    ...new Set([
      ...products.map(p => p.name),
      ...matchedCategories,
      ...matchingBrands.map(b => b.name)
    ])
  ].slice(0, 8)

  res.status(200).json({
    success: true,
    query: queryStr,
    cleanedQuery,
    showCorrection,
    priceConstraint: extractedPriceText,
    isShopScoped: !!shopId,
    intent,
    products: products.map(p => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      originalPrice: p.originalPrice,
      discount: p.discount,
      thumbnail: p.thumbnail || p.images?.[0]?.url || null,
      brand: p.brand,
      category: p.category
    })),
    suggestions,
    categories: matchedCategories,
    brands: matchingBrands,
    trending: TRENDING_SEARCHES.slice(0, 4)
  })
}

// ============================================================
// EXECUTE FULL SEARCH — GET /api/search
// ============================================================
export const executeSearch = async (req, res) => {
  const shopId = req.query.shopId || req.query.sellerId
  const { q = '', page = 1, limit = 12, sort = 'relevant', category, gender, brand } = req.query
  const { cleanedQuery, priceFilter, extractedPriceText, intent } = parseNaturalSearchQuery(q)

  const query = { isActive: true }

  if (shopId) query.sellerId = shopId
  if (priceFilter) query.price = priceFilter

  // Apply gender from URL param or intent
  const effectiveGender = gender || intent.gender
  if (effectiveGender) query.gender = effectiveGender

  // Apply category from URL param
  if (category) {
    const catArr = category.split(',').map(c => c.trim().toLowerCase())
    query.category = { $in: catArr }
  }

  // Apply brand from URL param
  if (brand) {
    const brandList = brand.split(',').map(b => b.trim()).filter(Boolean)
    if (brandList.length > 0) {
      const brandRegexes = brandList.map(b => new RegExp(`^${b.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'))
      query.$or = [
        { brand: { $in: brandRegexes } },
        { brandNormalized: { $in: brandList.map(b => b.toLowerCase().replace(/[^a-z0-9]/g, '')) } }
      ]
    }
  }

  // Full text search across key fields
  if (cleanedQuery) {
    const words = cleanedQuery.split(/\s+/).filter(Boolean)
    const andClauses = words.map(word => {
      const reg = new RegExp(word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
      return {
        $or: [
          { name: reg },
          { brand: reg },
          { category: reg },
          { tags: reg },
          { description: reg },
          { nameNormalized: reg },
          { brandNormalized: reg }
        ]
      }
    })
    if (query.$and) {
      query.$and = [...query.$and, ...andClauses]
    } else {
      query.$and = andClauses
    }
  }

  // Sort options
  const sortOptions = {
    relevant: { rating: -1, purchaseCount: -1, createdAt: -1 },
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
    popular: { purchaseCount: -1 }
  }
  const sortCriteria = sortOptions[sort] || sortOptions.relevant

  const skip = (Number(page) - 1) * Number(limit)
  const products = await Product.find(query)
    .sort(sortCriteria)
    .skip(skip)
    .limit(Number(limit))
    .lean()

  const total = await Product.countDocuments(query)

  // Track search analytics (non-blocking)
  if (q.trim()) {
    trackSearch(q.trim(), total, req)
  }

  res.status(200).json({
    success: true,
    query: q,
    parsedQuery: cleanedQuery,
    priceConstraint: extractedPriceText,
    parsedFilter: {
      cleanQuery: cleanedQuery,
      maxPrice: priceFilter?.$lte || priceFilter?.$lt || null,
      minPrice: priceFilter?.$gte || priceFilter?.$gt || null,
      gender: effectiveGender || null,
      intent
    },
    isShopScoped: !!shopId,
    count: products.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    products
  })
}

// ============================================================
// SEARCH ANALYTICS — GET /api/search/analytics (admin)
// ============================================================
export const getSearchAnalytics = async (req, res) => {
  const { days = 30 } = req.query
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)

  // Top searches
  const topSearches = await Analytics.aggregate([
    { $match: { type: 'search', timestamp: { $gte: since }, 'metadata.searchQuery': { $exists: true, $ne: '' } } },
    { $group: { _id: '$metadata.searchQuery', count: { $sum: 1 }, avgResults: { $avg: '$customData.resultCount' } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ])

  // No-result searches
  const noResultSearches = await Analytics.aggregate([
    { $match: { type: 'search', timestamp: { $gte: since }, 'customData.resultCount': 0 } },
    { $group: { _id: '$metadata.searchQuery', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ])

  const totalSearches = await Analytics.countDocuments({ type: 'search', timestamp: { $gte: since } })

  res.status(200).json({
    success: true,
    period: `${days} days`,
    totalSearches,
    topSearches: topSearches.map(s => ({ query: s._id, count: s.count, avgResults: Math.round(s.avgResults || 0) })),
    noResultSearches: noResultSearches.map(s => ({ query: s._id, count: s.count }))
  })
}

// Aliases
export const marketplaceSearch = executeSearch
