import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiGrid, FiList, FiSearch, FiSliders, FiHeart, FiShoppingBag, FiStar, FiX, FiCheckCircle } from 'react-icons/fi'
import { productService } from '@services/apiServices'
import { useCart } from '@context/CartContext'
import { useTheme } from '@context/ThemeContext'
import { useWishlist } from '@context/WishlistContext'
import { useShop } from '@context/ShopContext'
import { toast } from 'react-toastify'
import DynamicCampaignBanner from '@components/Marketing/DynamicCampaignBanner'

const GENDERS = ['men', 'women', 'kids', 'unisex']
const CATEGORIES = ['shirts', 't-shirts', 'jeans', 'sarees', 'hoodies', 'shoes', 'accessories', 'fashion-wear']
const BRANDS = ['SKLP Heritage', 'SKLP Royale', 'SKLP Studio', 'SKLP Footwear', 'SKLP Athletics', 'SKLP Kids']

function Products() {
  const { isDarkMode } = useTheme()
  const { addToCart } = useCart()
  const { toggleWishlist, isInWishlist } = useWishlist()
  const { selectedShop, clearShop, openShopModal } = useShop()
  const [searchParams, setSearchParams] = useSearchParams()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Filters State synced from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '')
  const [selectedGenders, setSelectedGenders] = useState(
    searchParams.get('gender') ? searchParams.get('gender').split(',') : []
  )
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.get('category') ? searchParams.get('category').split(',') : []
  )
  const [selectedBrands, setSelectedBrands] = useState(
    searchParams.get('brand') ? searchParams.get('brand').split(',').map(b => b.trim()).filter(Boolean) : []
  )
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(25000)
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Smart suggestions dropdown state
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Synchronize URL search params when navigation/route changes from outside
  useEffect(() => {
    const qParam = searchParams.get('q') || searchParams.get('search') || ''
    const gParam = searchParams.get('gender') ? searchParams.get('gender').split(',') : []
    const cParam = searchParams.get('category') ? searchParams.get('category').split(',') : []
    const bParam = searchParams.get('brand') ? searchParams.get('brand').split(',').map(b => b.trim()).filter(Boolean) : []
    const sParam = searchParams.get('sort') || 'newest'

    setSearchQuery(qParam)
    setSelectedGenders(gParam)
    setSelectedCategories(cParam)
    setSelectedBrands(bParam)
    setSortBy(sParam)
    setPage(1)
  }, [searchParams])

  // Load products based on active filters & shop scoping
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true)
      try {
        const activeShopId = selectedShop?._id || searchParams.get('shopId') || undefined

        const params = {
          page,
          limit: 24,
          sort: sortBy,
          priceMin: priceMin > 0 ? priceMin : undefined,
          priceMax: priceMax < 25000 ? priceMax : undefined,
          gender: selectedGenders.length > 0 ? selectedGenders.join(',') : undefined,
          category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
          brand: selectedBrands.length > 0 ? selectedBrands.join(',') : undefined,
          search: searchQuery || undefined,
          sellerId: activeShopId,
          tag: searchParams.get('tag') || undefined,
          offers: searchParams.get('offers') || undefined
        }

        const res = await productService.getProducts(params)
        if (res.data?.success && res.data.products) {
          const prodData = Array.isArray(res.data.products)
            ? res.data.products
            : (res.data.products.docs || [])
          setProducts(prodData)
          setTotalPages(res.data.products.totalPages || 1)
        }
      } catch (err) {
        console.warn('API getProducts error, utilizing fallback:', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFilteredProducts()
  }, [selectedGenders, selectedCategories, selectedBrands, priceMin, priceMax, sortBy, searchQuery, page, searchParams, selectedShop?._id])

  // Instant AI Search suggestions handler
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (val.trim().length > 1) {
      const combinedSuggestions = []
      BRANDS.forEach(b => {
        if (b.toLowerCase().includes(val.toLowerCase())) {
          combinedSuggestions.push({ text: `Browse Brand: ${b}`, type: 'brand', value: b })
        }
      })
      CATEGORIES.forEach(c => {
        if (c.toLowerCase().includes(val.toLowerCase())) {
          combinedSuggestions.push({ text: `Browse in ${c.toUpperCase()}`, type: 'category', value: c })
        }
      })
      GENDERS.forEach(g => {
        if (g.toLowerCase().includes(val.toLowerCase())) {
          combinedSuggestions.push({ text: `Browse for ${g.toUpperCase()}`, type: 'gender', value: g })
        }
      })
      if (combinedSuggestions.length === 0) {
        combinedSuggestions.push({ text: `Search for "${val}" in Clothing`, type: 'search', value: val })
      }
      setAiSuggestions(combinedSuggestions)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (sug) => {
    if (sug.type === 'category') {
      const updated = selectedCategories.includes(sug.value) ? selectedCategories : [...selectedCategories, sug.value]
      setSelectedCategories(updated)
      setSearchParams({ category: updated.join(',') })
    } else if (sug.type === 'gender') {
      const updated = selectedGenders.includes(sug.value) ? selectedGenders : [...selectedGenders, sug.value]
      setSelectedGenders(updated)
      setSearchParams({ gender: updated.join(',') })
    } else if (sug.type === 'brand') {
      setSingleBrand(sug.value)
    } else {
      setSearchQuery(sug.value)
      setSearchParams({ q: sug.value })
    }
    setShowSuggestions(false)
  }

  const toggleBrand = (brandName) => {
    const updated = selectedBrands.includes(brandName)
      ? selectedBrands.filter(b => b !== brandName)
      : [...selectedBrands, brandName]
    setSelectedBrands(updated)
    const newParams = Object.fromEntries(searchParams.entries())
    if (updated.length > 0) {
      newParams.brand = updated.join(',')
    } else {
      delete newParams.brand
    }
    setSearchParams(newParams)
    setPage(1)
  }

  const setSingleBrand = (brandName) => {
    if (!brandName) return
    setSelectedBrands([brandName])
    const newParams = Object.fromEntries(searchParams.entries())
    newParams.brand = brandName
    setSearchParams(newParams)
    setPage(1)
  }

  const clearBrandFilter = () => {
    setSelectedBrands([])
    const newParams = Object.fromEntries(searchParams.entries())
    delete newParams.brand
    setSearchParams(newParams)
    setPage(1)
  }

  const resetFilters = () => {
    setSelectedGenders([])
    setSelectedCategories([])
    setSelectedBrands([])
    setPriceMin(0)
    setPriceMax(25000)
    setSearchQuery('')
    setSortBy('newest')
    setPage(1)
    setSearchParams({})
  }

  // Strict Brand Filter: If any brand is selected, ONLY show products matching selected brand(s)
  const displayedProducts = selectedBrands.length > 0
    ? products.filter(p => p.brand && selectedBrands.some(b => b.toLowerCase().trim() === p.brand.toLowerCase().trim()))
    : products

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-8 py-6 sm:py-12 min-h-screen">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden py-8 sm:py-16 px-5 sm:px-8 mb-6 sm:mb-12 bg-luxury-charcoal border border-luxury-gold/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="z-10">
          <p className="text-luxury-gold text-xs tracking-[0.35em] uppercase mb-2">SKLP Fashion Collection</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-3">All Products</h1>
          <p className="text-sm text-white/60 max-w-md">Explore ethnic wear, everyday fashion, and footwear for men, women, and kids.</p>
        </div>
        <button
          onClick={resetFilters}
          className="z-10 text-xs px-6 py-3 border border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-luxury-black font-semibold transition-all uppercase tracking-wider"
        >
          Clear Filters
        </button>
      </div>

      {/* Selected Shop Scoping Banner */}
      {selectedShop && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-400/30 flex flex-wrap items-center justify-between gap-4 shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            {selectedShop.logo?.url ? (
              <img
                src={selectedShop.logo.url}
                alt={selectedShop.brandName || selectedShop.shopName}
                className="w-12 h-12 rounded-xl object-cover border border-amber-400/40 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-serif font-black text-xl flex items-center justify-center shadow-md">
                {(selectedShop.brandName || selectedShop.shopName || 'B').charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                  Exclusive Brand Store
                </span>
                <FiCheckCircle size={13} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-bold font-serif tracking-tight">
                Shopping at: {selectedShop.brandName || selectedShop.shopName}
              </h2>
              <p className="text-xs text-gray-400">
                Browsing is currently scoped to this verified fashion house
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openShopModal}
              className="px-4 py-2 rounded-xl border border-amber-400/40 text-xs font-bold text-amber-300 hover:bg-amber-400/10 transition-all uppercase tracking-wider"
            >
              Change Brand
            </button>
            <button
              onClick={clearShop}
              className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-all uppercase tracking-wider"
            >
              Browse All Brands
            </button>
          </div>
        </motion.div>
      )}

      {/* Dynamic Marketing Campaign Banner */}
      <DynamicCampaignBanner placement="products" className="mb-6" />

      {/* Mobile Quick-Filter Chips Bar — horizontal scroll */}
      <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-3 px-3">
        {['All', ...GENDERS].map(g => {
          const val = g === 'All' ? null : g
          const isActive = val === null ? selectedGenders.length === 0 : selectedGenders.includes(g)
          return (
            <button
              key={g}
              onClick={() => val === null ? setSelectedGenders([]) : setSelectedGenders(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all touch-target ${
                isActive ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-luxury-gold/30 text-white/70'
              }`}
            >
              {g}
            </button>
          )
        })}
        <div className="w-px bg-luxury-gold/20 flex-shrink-0" />
        {CATEGORIES.map(cat => {
          const isActive = selectedCategories.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat])}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold capitalize tracking-wider border transition-all touch-target ${
                isActive ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-white/20 text-white/60'
              }`}
            >
              {cat.replace('-', ' ')}
            </button>
          )
        })}
      </div>

      {/* Advanced AI Search and Filters Control bar */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-center mb-6 sm:mb-8 w-full z-20 relative">
        {/* Instant Search with Dropdown */}
        <div className="relative w-full lg:max-w-xl">
          <div className={`flex items-center px-4 py-3 rounded-xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-mediumGray/30' : 'bg-white border-gray-200'} transition-all focus-within:ring-2 focus-within:ring-luxury-gold`}>
            <FiSearch className="text-luxury-gold text-lg mr-3" />
            <input
              type="text"
              placeholder="Search fashion garments, sarees, velvet wear..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => { if (aiSuggestions.length > 0) setShowSuggestions(true) }}
              className={`bg-transparent border-none p-0 outline-none w-full text-sm focus:ring-0 ${isDarkMode ? 'text-white placeholder-white/40' : 'text-luxury-black placeholder-black/45'}`}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSuggestions(false) }}>
                <FiX className="text-white/60 hover:text-white" />
              </button>
            )}
          </div>

          {/* AI Suggestions Panel */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`absolute top-full left-0 right-0 mt-2 z-50 p-2 rounded-xl border shadow-2xl ${isDarkMode ? 'bg-luxury-charcoal border-luxury-mediumGray/50 text-white' : 'bg-white border-gray-100 text-black'}`}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-luxury-gold px-3 py-1 mb-1 font-semibold">AI Smart Suggestions</p>
                {aiSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(sug)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-luxury-gold hover:text-luxury-black transition-all flex items-center justify-between"
                  >
                    <span>{sug.text}</span>
                    <span className="text-[10px] uppercase font-mono tracking-widest opacity-60">{sug.type}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-luxury-gold/30 rounded-xl text-sm touch-target"
          >
            <FiSliders className="text-luxury-gold" /> Filters
          </button>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`text-sm px-4 py-3 rounded-xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-mediumGray/30 text-white' : 'bg-white border-gray-200 text-luxury-black'}`}
          >
            <option value="newest">Newest First</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>

          {/* Grid Toggle */}
          <div className="flex items-center gap-2 border border-luxury-gold/20 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-luxury-gold text-luxury-black' : 'text-luxury-gold'}`}
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-luxury-gold text-luxury-black' : 'text-luxury-gold'}`}
            >
              <FiList size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 xl:gap-8 relative">
        {/* ============ DESKTOP SIDEBAR FILTERS ============ */}
        <aside className={`hidden lg:block w-72 flex-shrink-0 card p-6 rounded-2xl ${isDarkMode ? 'bg-luxury-charcoal' : 'bg-white'} border border-luxury-gold/10 self-start`}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <h3 className="text-lg font-serif font-bold tracking-wider">REFINE BY</h3>
          </div>

          {/* Gender */}
          <div className="mb-6">
            <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Gender</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedGenders([])}
                className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 ${
                  selectedGenders.length === 0
                    ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                    : isDarkMode
                      ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                      : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                }`}
              >
                All
              </button>
              {GENDERS.map(g => {
                const isSelected = selectedGenders.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGenders(selectedGenders.filter(item => item !== g));
                      } else {
                        setSelectedGenders([...selectedGenders, g]);
                      }
                    }}
                    className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 capitalize ${
                      isSelected
                        ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                        : isDarkMode
                          ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                          : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand Houses */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold">Brand House</h4>
              {selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={clearBrandFilter}
                  className="text-[10px] text-red-400 hover:underline font-bold"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={clearBrandFilter}
                className={`w-full py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 text-left flex items-center justify-between ${
                  selectedBrands.length === 0
                    ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                    : isDarkMode
                      ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                      : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                }`}
              >
                <span>All Brands</span>
                {selectedBrands.length === 0 && <FiCheckCircle size={13} className="text-black" />}
              </button>
              {BRANDS.map(b => {
                const isSelected = selectedBrands.includes(b)
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBrand(b)}
                    className={`w-full py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                        : isDarkMode
                          ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                          : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                    }`}
                  >
                    <span className="truncate">{b}</span>
                    {isSelected && <FiCheckCircle size={13} className="text-black shrink-0 ml-1" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Category */}
          <div className="mb-6">
            <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Category</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 ${
                  selectedCategories.length === 0
                    ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                    : isDarkMode
                      ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                      : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter(item => item !== cat));
                      } else {
                        setSelectedCategories([...selectedCategories, cat]);
                      }
                    }}
                    className={`py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 capitalize truncate ${
                      isSelected
                        ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                        : isDarkMode
                          ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                          : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                    }`}
                    title={cat.replace('-', ' ')}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Slider */}
          <div className="mb-6">
            <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Price Limit</h4>
            <input
              type="range"
              min="0"
              max="25000"
              step="500"
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="w-full accent-luxury-gold cursor-pointer"
            />
            <div className="flex justify-between text-xs mt-2 font-mono">
              <span>₹0</span>
              <span className="text-luxury-gold font-bold">Max: ₹{priceMax.toLocaleString()}</span>
            </div>
          </div>
        </aside>

        {/* ============ PRODUCTS SECTION ============ */}
        <div className="flex-1 min-w-0">
          {/* Active Brand Filter Banner */}
          {selectedBrands.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl border border-luxury-gold/30 bg-luxury-gold/10 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-luxury-gold">Active Brand Filter:</span>
                {selectedBrands.map(b => (
                  <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1 bg-luxury-gold text-black rounded-full text-xs font-black shadow-glow">
                    {b}
                    <button type="button" onClick={() => toggleBrand(b)} className="hover:opacity-70 p-0.5">
                      <FiX size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={clearBrandFilter}
                className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider underline"
              >
                Clear Brand Filter ({displayedProducts.length} items)
              </button>
            </div>
          )}

          {loading ? (
            /* Skeleton Loading Grid */
            <div className={`grid gap-3 sm:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-1'}`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col gap-4">
                  <div className="w-full aspect-[3/4] bg-luxury-charcoal rounded-2xl" />
                  <div className="h-4 bg-luxury-charcoal w-2/3 rounded" />
                  <div className="h-4 bg-luxury-charcoal w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-20 card rounded-2xl border border-white/5">
              <p className="text-lg opacity-60 mb-4">
                {selectedBrands.length > 0
                  ? `No products found specifically for brand "${selectedBrands.join(', ')}".`
                  : 'No premium apparel matches your specific filter criteria.'}
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-3 bg-luxury-gold text-luxury-black font-semibold tracking-wider rounded-lg"
              >
                Show All Products
              </button>
            </div>
          ) : (
            /* Main Product Rendering */
            <motion.div
              layout
              className={`grid gap-3 sm:gap-6 ${
                viewMode === 'grid'
                  ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                  : 'grid-cols-1'
              }`}
            >
              {displayedProducts.map((p) => (
                <motion.div
                  key={p._id || p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`relative rounded-2xl ${isDarkMode ? 'bg-luxury-charcoal' : 'bg-white'} border border-luxury-gold/5 overflow-hidden flex ${viewMode === 'list' ? 'flex-col md:flex-row gap-6 p-4' : 'flex-col'}`}
                >
                  {/* Image wrapper */}
                  <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-full md:w-56 aspect-[3/4]' : 'w-full aspect-[3/4]'}`}>
                    <Link to={`/products/${p._id || p.id}`}>
                      <img
                        src={p.images?.[0]?.url || p.image}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </Link>
                    {p.discount > 0 && (
                      <span className="absolute top-3 left-3 px-3 py-1 bg-luxury-gold text-luxury-black text-xs font-bold rounded-full">
                        -{p.discount}%
                      </span>
                    )}
                  </div>

                  {/* Info details */}
                  <div className={`p-3 sm:p-5 flex-1 flex flex-col justify-between`}>
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setSingleBrand(p.brand || 'SKLP')
                        }}
                        className="text-[10px] sm:text-xs uppercase tracking-widest text-luxury-gold mb-0.5 sm:mb-1 hover:underline cursor-pointer font-bold text-left block"
                        title={`Filter by brand: ${p.brand || 'SKLP'}`}
                      >
                        {p.brand || 'SKLP'}
                      </button>
                      <Link to={`/products/${p._id || p.id}`}>
                        <h3 className={`font-serif font-bold text-sm sm:text-lg mb-1 sm:mb-2 hover:text-luxury-gold transition-colors line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</h3>
                      </Link>
                      <div className="hidden sm:flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <FiStar key={i} size={12} className={i < (p.rating || 5) ? 'text-luxury-gold fill-luxury-gold' : 'text-gray-400'} />
                        ))}
                      </div>
                      {viewMode === 'list' && (
                        <p className="text-sm opacity-60 mb-4 line-clamp-3">{p.description}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-3 mb-2 sm:mb-4">
                        <span className="text-sm sm:text-xl font-bold text-luxury-gold">₹{p.price.toLocaleString()}</span>
                        {p.originalPrice && (
                          <span className="text-xs line-through opacity-40">₹{p.originalPrice.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={() => { addToCart(p, 1); toast.success('Added to Cart!') }}
                          className="flex-grow flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 px-2 bg-luxury-gold text-luxury-black font-extrabold text-[9px] sm:text-xs uppercase tracking-wider hover:bg-yellow-400 active:scale-95 transition-all whitespace-nowrap rounded-lg touch-target"
                        >
                          <FiShoppingBag size={12} className="shrink-0" /> <span className="hidden xs:inline">Add </span>Cart
                        </button>
                        <button
                          onClick={() => toggleWishlist(p)}
                          className={`p-2.5 sm:p-3 border rounded-lg transition-colors duration-200 touch-target ${
                            isInWishlist(p._id || p.id)
                              ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                              : isDarkMode
                                ? 'border-white/10 text-luxury-gold hover:bg-white/5'
                                : 'border-gray-200 text-luxury-gold hover:bg-gray-50'
                          }`}
                          aria-label="Toggle Wishlist"
                        >
                          <FiHeart size={14} className={isInWishlist(p._id || p.id) ? 'fill-current' : ''} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Simple Premium Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-12">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-5 py-3 border border-luxury-gold/30 rounded-lg text-sm disabled:opacity-30 hover:bg-luxury-gold hover:text-luxury-black transition-colors"
              >
                Previous
              </button>
              <span className="px-5 py-3 bg-luxury-gold text-luxury-black font-bold rounded-lg text-sm flex items-center">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-5 py-3 border border-luxury-gold/30 rounded-lg text-sm disabled:opacity-30 hover:bg-luxury-gold hover:text-luxury-black transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ MOBILE BOTTOM-SHEET FILTERS ============ */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileFilters(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-h-[88vh] rounded-t-3xl p-5 sm:p-6 flex flex-col safe-pb ${isDarkMode ? 'bg-luxury-black text-white' : 'bg-white text-black'}`}
            >
              {/* Handle bar */}
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-4 flex-shrink-0" />
              <div className="overflow-y-auto flex-1">
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                  <h3 className="text-lg font-serif font-bold">FILTERS</h3>
                  <button onClick={() => setShowMobileFilters(false)} className="touch-target flex items-center justify-center">
                    <FiX size={22} className="text-luxury-gold" />
                  </button>
                </div>

                {/* Mobile Gender */}
                <div className="mb-6">
                  <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Gender</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGenders([])}
                      className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 ${
                        selectedGenders.length === 0
                          ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                          : isDarkMode
                            ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                            : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                      }`}
                    >
                      All
                    </button>
                    {GENDERS.map(g => {
                      const isSelected = selectedGenders.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGenders(selectedGenders.filter(item => item !== g))
                            } else {
                              setSelectedGenders([...selectedGenders, g])
                            }
                          }}
                          className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 capitalize ${
                            isSelected
                              ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                              : isDarkMode
                                ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                                : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Brand Houses */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold">Brand House</h4>
                    {selectedBrands.length > 0 && (
                      <button
                        type="button"
                        onClick={clearBrandFilter}
                        className="text-[10px] text-red-400 hover:underline font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={clearBrandFilter}
                      className={`py-2 px-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 text-center ${
                        selectedBrands.length === 0
                          ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                          : isDarkMode
                            ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                            : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                      }`}
                    >
                      All Brands
                    </button>
                    {BRANDS.map(b => {
                      const isSelected = selectedBrands.includes(b)
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => toggleBrand(b)}
                          className={`py-2 px-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 truncate text-center ${
                            isSelected
                              ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                              : isDarkMode
                                ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                                : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                          }`}
                          title={b}
                        >
                          {b}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile Category */}
                <div className="mb-6">
                  <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Category</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 ${
                        selectedCategories.length === 0
                          ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                          : isDarkMode
                            ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                            : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                      }`}
                    >
                      All
                    </button>
                    {CATEGORIES.map(c => {
                      const isSelected = selectedCategories.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCategories(selectedCategories.filter(item => item !== c))
                            } else {
                              setSelectedCategories([...selectedCategories, c])
                            }
                          }}
                          className={`py-2 px-1 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 transition-all duration-300 capitalize truncate ${
                            isSelected
                              ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-glow'
                              : isDarkMode
                                ? 'border-white/10 hover:border-luxury-gold/50 text-white/70 hover:text-white bg-white/5'
                                : 'border-black/10 hover:border-luxury-gold/50 text-black/70 hover:text-black bg-black/5'
                          }`}
                          title={c.replace('-', ' ')}
                        >
                          {c.replace('-', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Price */}
                <div className="mb-6">
                  <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Price Limit</h4>
                  <input
                    type="range"
                    min="0"
                    max="25000"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full accent-luxury-gold"
                  />
                  <div className="flex justify-between text-xs mt-2">
                    <span>₹0</span>
                    <span className="text-luxury-gold font-bold">Max: ₹{priceMax.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10 mt-4 flex-shrink-0">
                <button
                  onClick={() => { resetFilters(); setShowMobileFilters(false) }}
                  className="flex-1 py-3.5 border border-luxury-gold/30 rounded-xl font-bold text-xs tracking-wider uppercase touch-target"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-3.5 bg-luxury-gold text-luxury-black font-bold text-xs tracking-wider uppercase hover:bg-yellow-400 rounded-xl touch-target"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Products
