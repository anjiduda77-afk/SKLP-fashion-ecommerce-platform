import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiGrid, FiList, FiSearch, FiSliders, FiHeart, FiShoppingBag, FiStar, FiX } from 'react-icons/fi'
import { productService } from '@services/apiServices'
import { useCart } from '@context/CartContext'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'

const GENDERS = ['men', 'women', 'kids', 'unisex']
const CATEGORIES = ['shirts', 't-shirts', 'jeans', 'sarees', 'hoodies', 'shoes', 'accessories', 'fashion-wear']

function Products() {
  const { isDarkMode } = useTheme()
  const { addToCart } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedGender, setSelectedGender] = useState(searchParams.get('gender') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(25000)
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Smart suggestions dropdown state
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Load products based on query filters
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true)
      try {
        const params = {
          page,
          limit: 9,
          sort: sortBy,
          priceMin: priceMin > 0 ? priceMin : undefined,
          priceMax: priceMax < 25000 ? priceMax : undefined,
          gender: selectedGender || undefined,
          category: selectedCategory || undefined,
          search: searchQuery || undefined
        }

        const res = await productService.getProducts(params)
        if (res.data && res.data.products) {
          // If Paginated response
          const prodData = res.data.products.docs || res.data.products
          setProducts(prodData || [])
          setTotalPages(res.data.products.totalPages || 1)
        }
      } catch (err) {
        console.warn('Backend API getProducts failed, using mock data:', err.message)
        // Luxury Mock Fallback
        const mockDb = [
          { _id: 'f1', name: 'Premium Velvet Blazer', price: 8999, originalPrice: 12999, discount: 30, image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Royale', category: 'fashion-wear', gender: 'men', rating: 5 },
          { _id: 'f2', name: 'Royal Heritage Banarasi Silk Saree', price: 14999, originalPrice: 24900, discount: 40, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Heritage', category: 'sarees', gender: 'women', rating: 5 },
          { _id: 'f3', name: 'Italian Leather Oxford Shoes', price: 9999, originalPrice: 15999, discount: 37, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Footwear', category: 'shoes', gender: 'men', rating: 4 },
          { _id: 'f4', name: 'Luxury Velvet Heel Stilettos', price: 4999, originalPrice: 7999, discount: 37, image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Footwear', category: 'shoes', gender: 'women', rating: 5 },
          { _id: 't1', name: 'Ultra-Comfort Luxury Hoodie', price: 3499, originalPrice: 4999, discount: 30, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Athletics', category: 'hoodies', gender: 'men', rating: 4 },
          { _id: 't2', name: 'Sleek Silhouette Trench Coat', price: 5999, originalPrice: 8999, discount: 33, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Studio', category: 'fashion-wear', gender: 'women', rating: 4 },
          { _id: 't3', name: 'Soft Denim Dungarees Set', price: 1999, originalPrice: 2999, discount: 33, image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Kids', category: 'jeans', gender: 'kids', rating: 5 },
          { _id: 't4', name: 'Premium Leather High-Top Sneakers', price: 2499, originalPrice: 3999, discount: 37, image: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=600&q=80', brand: 'SKLP Kids', category: 'shoes', gender: 'kids', rating: 5 }
        ]
        
        let filtered = mockDb.filter(p => {
          if (selectedGender && p.gender !== selectedGender) return false
          if (selectedCategory && p.category !== selectedCategory) return false
          if (p.price < priceMin || p.price > priceMax) return false
          if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
          return true
        })

        if (sortBy === 'priceAsc') filtered.sort((a, b) => a.price - b.price)
        if (sortBy === 'priceDesc') filtered.sort((a, b) => b.price - a.price)
        if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating)

        setProducts(filtered)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    fetchFilteredProducts()
  }, [selectedGender, selectedCategory, priceMin, priceMax, sortBy, searchQuery, page])

  // Instant AI Search suggestions handler
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (val.trim().length > 1) {
      // Find matching items from category or text keywords to showcase smart helper suggestions
      const combinedSuggestions = []
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
      setSelectedCategory(sug.value)
    } else if (sug.type === 'gender') {
      setSelectedGender(sug.value)
    } else {
      setSearchQuery(sug.value)
    }
    setShowSuggestions(false)
  }

  const resetFilters = () => {
    setSelectedGender('')
    setSelectedCategory('')
    setPriceMin(0)
    setPriceMax(25000)
    setSearchQuery('')
    setSortBy('newest')
    setSearchParams({})
  }

  return (
    <div className="container-custom py-12 min-h-screen">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden py-16 px-8 mb-12 bg-luxury-charcoal border border-luxury-gold/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="z-10">
          <p className="text-luxury-gold text-xs tracking-[0.35em] uppercase mb-2">SKLP Signature Collection</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-3">Our Collections</h1>
          <p className="text-sm text-white/60 max-w-md">Bespoke fashion garments and premium Italian leather footwear crafted for individuals of style.</p>
        </div>
        <button
          onClick={resetFilters}
          className="z-10 text-xs px-6 py-3 border border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-luxury-black font-semibold transition-all uppercase tracking-wider"
        >
          Reset Filters
        </button>
      </div>

      {/* Advanced AI Search and Filters Control bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-8 w-full z-20 relative">
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
              className="bg-transparent border-none p-0 outline-none w-full text-sm placeholder-white/40 focus:ring-0"
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
        <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-3 border border-luxury-gold/30 rounded-xl text-sm"
          >
            <FiSliders className="text-luxury-gold" /> Filters
          </button>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`text-sm px-4 py-3 rounded-xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-mediumGray/30' : 'bg-white border-gray-200'}`}
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

      <div className="flex gap-8 relative">
        {/* ============ DESKTOP SIDEBAR FILTERS ============ */}
        <aside className={`hidden lg:block w-72 flex-shrink-0 card p-6 rounded-2xl ${isDarkMode ? 'bg-luxury-charcoal' : 'bg-white'} border border-luxury-gold/10 self-start`}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <h3 className="text-lg font-serif font-bold tracking-wider">REFINE BY</h3>
          </div>

          {/* Gender */}
          <div className="mb-6">
            <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Gender</h4>
            <div className="space-y-2">
              <label key="all-g" className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  checked={selectedGender === ''}
                  onChange={() => setSelectedGender('')}
                  className="rounded-full text-luxury-gold focus:ring-luxury-gold"
                />
                All Genders
              </label>
              {GENDERS.map(g => (
                <label key={g} className="flex items-center gap-3 text-sm cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="gender"
                    checked={selectedGender === g}
                    onChange={() => setSelectedGender(g)}
                    className="rounded-full text-luxury-gold focus:ring-luxury-gold"
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="mb-6">
            <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Category</h4>
            <div className="space-y-2">
              <label key="all-c" className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === ''}
                  onChange={() => setSelectedCategory('')}
                  className="rounded-full text-luxury-gold focus:ring-luxury-gold"
                />
                All Categories
              </label>
              {CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center gap-3 text-sm cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                    className="rounded-full text-luxury-gold focus:ring-luxury-gold"
                  />
                  {cat.replace('-', ' ')}
                </label>
              ))}
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
        <div className="flex-1">
          {loading ? (
            /* Skeleton Loading Grid */
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col gap-4">
                  <div className="w-full aspect-[3/4] bg-luxury-charcoal rounded-2xl" />
                  <div className="h-4 bg-luxury-charcoal w-2/3 rounded" />
                  <div className="h-4 bg-luxury-charcoal w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 card rounded-2xl border border-white/5">
              <p className="text-lg opacity-60 mb-4">No premium apparel matches your specific filter criteria.</p>
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
              className={`grid gap-6 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}
            >
              {products.map((p) => (
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
                  <div className={`p-5 flex-1 flex flex-col justify-between`}>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-luxury-gold mb-1">{p.brand || 'SKLP'}</p>
                      <Link to={`/products/${p._id || p.id}`}>
                        <h3 className={`font-serif font-bold text-lg mb-2 hover:text-luxury-gold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</h3>
                      </Link>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <FiStar key={i} size={12} className={i < (p.rating || 5) ? 'text-luxury-gold fill-luxury-gold' : 'text-gray-400'} />
                        ))}
                      </div>
                      {viewMode === 'list' && (
                        <p className="text-sm opacity-60 mb-4 line-clamp-3">{p.description}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl font-bold text-luxury-gold">₹{p.price.toLocaleString()}</span>
                        {p.originalPrice && (
                          <span className="text-sm line-through opacity-40">₹{p.originalPrice.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { addToCart(p, 1); toast.success('Added to Cart!') }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-luxury-gold text-luxury-black font-bold text-xs tracking-wider uppercase hover:bg-yellow-400 transition-colors"
                        >
                          <FiShoppingBag /> Add to Cart
                        </button>
                        <button className={`p-3 border rounded-lg ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <FiHeart className="text-luxury-gold" />
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

      {/* ============ MOBILE BOTTOM FILTERS MODAL ============ */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween' }}
              className={`w-full max-w-md h-full p-6 flex flex-col justify-between ${isDarkMode ? 'bg-luxury-black text-white' : 'bg-white text-black'}`}
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <h3 className="text-lg font-serif font-bold">FILTERS</h3>
                  <button onClick={() => setShowMobileFilters(false)}>
                    <FiX size={24} className="text-luxury-gold" />
                  </button>
                </div>

                {/* Mobile Gender */}
                <div className="mb-6">
                  <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Gender</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGender('')}
                      className={`px-4 py-2 text-xs rounded-full border ${selectedGender === '' ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-white/10'}`}
                    >
                      All
                    </button>
                    {GENDERS.map(g => (
                      <button
                        key={g}
                        onClick={() => setSelectedGender(g)}
                        className={`px-4 py-2 text-xs rounded-full border capitalize ${selectedGender === g ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-white/10'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Category */}
                <div className="mb-6">
                  <h4 className="font-semibold text-xs tracking-widest uppercase text-luxury-gold mb-3">Category</h4>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-4 py-2 text-xs rounded-full border ${selectedCategory === '' ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-white/10'}`}
                    >
                      All
                    </button>
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`px-4 py-2 text-xs rounded-full border capitalize ${selectedCategory === c ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-white/10'}`}
                      >
                        {c.replace('-', ' ')}
                      </button>
                    ))}
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

              <div className="flex gap-4">
                <button
                  onClick={resetFilters}
                  className="flex-1 py-4 border border-luxury-gold/30 font-bold text-xs tracking-wider uppercase"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-4 bg-luxury-gold text-luxury-black font-bold text-xs tracking-wider uppercase hover:bg-yellow-400"
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
