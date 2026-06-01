import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiArrowRight, FiChevronLeft, FiChevronRight, FiStar, FiHeart, 
  FiShoppingBag, FiTruck, FiShield, FiRefreshCw, FiHeadphones, FiZap, FiEye 
} from 'react-icons/fi'
import { useTheme } from '@context/ThemeContext'
import { useCart } from '@context/CartContext'
import { useWishlist } from '@context/WishlistContext'
import { toast } from 'react-toastify'

const heroSlides = [
  {
    id: 1,
    title: 'ELEGANT INDIAN\nWEAR',
    subtitle: 'Festive Collection 2026',
    description: 'Handwoven pure Banarasi silk sarees with gold borders and elegant designs.',
    cta: 'Shop Now',
    link: '/products?gender=women',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80',
    accent: 'from-amber-950/80 via-black/60 to-black/90',
  },
  {
    id: 2,
    title: 'STYLES IN\nTREND',
    subtitle: 'Menswear Essentials',
    description: 'Tailored shirts, comfortable kurtas, and stylish blazers for every occasion.',
    cta: 'Shop Menswear',
    link: '/products?gender=men',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1400&q=80',
    accent: 'from-yellow-950/70 via-black/50 to-black/80',
  },
  {
    id: 3,
    title: 'KIDS HAPPY\nCLOTHES',
    subtitle: 'Playful Kids Wear',
    description: 'Soft cotton sets, denim dungarees, and comfortable shoes for active kids.',
    cta: 'Shop Kids',
    link: '/products?gender=kids',
    image: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=1400&q=80',
    accent: 'from-yellow-900/60 via-black/40 to-black/80',
  },
]

const mainCategories = [
  { name: 'Men', subcategories: ['Trending', 'Shirts', 'T-Shirts', 'Jeans', 'Pants', 'Track Pants', 'Shorts', 'Underwear', 'Hoodies', 'Clothes', 'Shoes', 'Sneakers', 'Slippers', 'Watches', 'Accessories', 'Sportswear', 'Exclusive Collections'] },
  { name: 'Women', subcategories: ['Sarees', 'Blouses', 'Dresses', 'Kurtis', 'Cosmetics', 'Jewelry', 'Handbags', 'Footwear', 'Makeup', 'Fashion Accessories', 'Exclusive Collections', 'Trending Styles'] },
  { name: 'Kids', subcategories: ['Clothing', 'School Wear', 'Shoes', 'Toys', 'Accessories', 'Trending Collections'] },
  { name: 'Footwear', subcategories: ['Sneakers', 'Boots', 'Loafers', 'Oxfords', 'High Heels', 'Slippers'] },
  { name: 'Accessories', subcategories: ['Exclusive Watches', 'Leather Handbags', 'Fine Jewelry', 'Sunglasses', 'Wallets'] },
  { name: 'Sportswear', subcategories: ['Athleisure', 'Hoodies', 'Track Pants', 'Running Shoes', 'Caps'] },
  { name: 'Exclusive Collections', subcategories: ['Pure Banarasi Silk', 'Premium Cotton', 'Elite Leather', 'Designer Drops'] },
  { name: 'Trending Fashion', subcategories: ['Weekend Drops', 'Summer wear', 'Athletic Sneakers'] }
]

const servicesList = [
  { icon: FiTruck, title: 'Free Fast Delivery', desc: 'On orders above ₹1,999' },
  { icon: FiShield, title: '100% Original Products', desc: 'Genuine high-quality items' },
  { icon: FiRefreshCw, title: 'Easy 7-Day Returns', desc: '7-day easy returns & refunds' },
  { icon: FiHeadphones, title: '24/7 Customer Support', desc: 'We are here to help you anytime' },
]

const designerLabels = [
  { brand: 'Traditional Handlooms', desc: 'Exquisite silk weaving & hand craftsmanship' },
  { brand: 'Modern Blazers', desc: 'Deep velvet evening wear & elegant blazers' },
  { brand: 'Studio SKLP', desc: 'Contemporary activewear with gold accents' },
  { brand: 'Premium Leather', desc: 'Fine genuine leather boots & shoes' }
]

const mockProductsData = [
  // Men's Products
  { id: 'm1', name: 'Premium Velvet Evening Blazer', price: 8999, originalPrice: 12999, discount: 30, image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80', brand: 'Noir Edit', rating: 4.8, delivery: 'Express 2-day delivery', category: 'Men', subcategory: 'Hoodies', inStock: true, stockLeft: 3 },
  { id: 'm2', name: 'Gold Trim High-Top Sneakers', price: 2499, originalPrice: 3999, discount: 37, image: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=600&q=80', brand: 'Studio SKLP', rating: 4.8, delivery: 'Free delivery tomorrow', category: 'Men', subcategory: 'Sneakers', inStock: true, stockLeft: 8 },
  { id: 'm3', name: 'Elite Leather Chrono Watch', price: 6999, originalPrice: 9999, discount: 30, image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80', brand: 'Gold Atelier', rating: 4.7, delivery: 'Secure courier dispatch', category: 'Men', subcategory: 'Watches', inStock: true, stockLeft: 2 },
  
  // Women's Products
  { id: 'w1', name: 'Royal Banarasi Silk Saree', price: 14999, originalPrice: 24900, discount: 40, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80', brand: 'Aurora Luxe', rating: 4.9, delivery: 'Complimentary shipping', category: 'Women', subcategory: 'Sarees', inStock: true, stockLeft: 5 },
  { id: 'w2', name: 'Sleek Silhouette Trench Coat', price: 5999, originalPrice: 8999, discount: 33, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80', brand: 'Noir Edit', rating: 4.7, delivery: 'Express 2-day delivery', category: 'Women', subcategory: 'Dresses', inStock: true, stockLeft: 4 },
  { id: 'w3', name: 'Luxury Banarasi Evening Blouse', price: 2999, originalPrice: 4999, discount: 40, image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80', brand: 'Aurora Luxe', rating: 4.6, delivery: 'Fast dispatch', category: 'Women', subcategory: 'Blouses', inStock: true, stockLeft: 7 },

  // Kids' Products
  { id: 'k1', name: 'Soft Denim Dungarees Set', price: 1999, originalPrice: 2999, discount: 33, image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80', brand: 'Studio SKLP', rating: 4.5, delivery: 'Free delivery', category: 'Kids', subcategory: 'Clothing', inStock: true, stockLeft: 6 },
  { id: 'k2', name: 'Retro Leather High-Tops', price: 1799, originalPrice: 2499, discount: 28, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80', brand: 'Gold Atelier', rating: 4.6, delivery: 'Fast dispatch', category: 'Kids', subcategory: 'Shoes', inStock: true, stockLeft: 9 },

  // Footwear General
  { id: 'f1', name: 'Italian Leather Oxford Boots', price: 9999, originalPrice: 15999, discount: 37, image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80', brand: 'Gold Atelier', rating: 4.8, delivery: 'Complimentary shipping', category: 'Footwear', subcategory: 'Boots', inStock: true, stockLeft: 3 }
]

function ProductCard({ product, isDarkMode }) {
  const [isHovered, setIsHovered] = useState(false)
  const { addToCart } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()
  
  const wishlisted = isInWishlist(product.id)

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Map image string to thumbnail property so CartContext parses it correctly
    addToCart({
      ...product,
      thumbnail: product.image
    })
    toast.success(`Added ${product.name} to Cart 🛍️`)
  }

  const handleWishlistToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative"
    >
      <div 
        className={`relative overflow-hidden rounded-[2.2rem] border transition-all duration-500 flex flex-col h-full
          ${isDarkMode 
            ? 'bg-luxury-black/60 border-white/10 text-white shadow-dark-glow hover:border-luxury-gold/50' 
            : 'bg-white border-luxury-gold/20 text-luxury-darkBlack shadow-card hover:border-luxury-darkGold'
          }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Product Image Frame */}
        <div className="relative aspect-[3/4] overflow-hidden bg-current/5">
          <img 
            src={product.image} 
            alt={product.name} 
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
            loading="lazy"
          />
          
          {/* Glassmorphic Action Tray Overlay on Hover */}
          <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-3 transition-opacity duration-300
            ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <button 
              onClick={handleAddToCart}
              className="w-12 h-12 rounded-full bg-luxury-gold text-black flex items-center justify-center hover:scale-110 active:scale-95 transition"
              title="Quick Add to Cart"
            >
              <FiShoppingBag size={18} />
            </button>
            <button 
              onClick={handleWishlistToggle}
              className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition
                ${wishlisted ? 'bg-red-500 text-white' : 'bg-white/15 text-white'}`}
              title="Add to Wishlist"
            >
              <FiHeart size={18} className={wishlisted ? 'fill-current' : ''} />
            </button>
          </div>

          {/* Discount badge */}
          {product.discount > 0 && (
            <span className="absolute top-4 left-4 rounded-full bg-luxury-gold px-3.5 py-1 text-[10px] font-extrabold text-black shadow-glow">
              -{product.discount}%
            </span>
          )}

          {/* Stock Alert Badge */}
          {product.stockLeft <= 3 && (
            <span className="absolute top-4 right-4 rounded-full bg-red-500 px-3 py-1 text-[9px] font-bold text-white shadow-lg animate-pulse">
              Only {product.stockLeft} Left
            </span>
          )}
        </div>

        {/* Product Meta */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-luxury-gold font-bold">{product.brand}</p>
              <span className={`text-[9px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5
                ${product.inStock ? 'bg-luxury-gold/10 text-luxury-gold' : 'bg-red-500/10 text-red-500'}`}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            
            <Link to={`/products/${product.id}`} className="block group-hover:text-luxury-gold transition-colors">
              <h3 className="font-serif font-bold text-base leading-tight mb-2 line-clamp-2">
                {product.name}
              </h3>
            </Link>

            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex items-center gap-0.5 text-luxury-gold">
                {[...Array(5)].map((_, idx) => (
                  <FiStar 
                    key={idx} 
                    size={12} 
                    className={idx < Math.round(product.rating) ? 'fill-current text-luxury-gold' : 'text-current/20'} 
                  />
                ))}
              </div>
              <span className="text-[10px] font-semibold opacity-60">({(product.rating || 4.5).toFixed(1)})</span>
            </div>
          </div>

          <div>
            {/* Price section */}
            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <span className="text-lg font-bold text-luxury-gold">
                ₹{product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-xs line-through opacity-40">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Delivery Info */}
            <div className="flex items-center gap-1.5 text-[10px] opacity-60 mb-4">
              <FiTruck size={12} className="text-luxury-gold" />
              <span>{product.delivery}</span>
            </div>

            {/* Quick Add Bottom Row */}
            <button 
              onClick={handleAddToCart}
              className={`w-full py-3 rounded-xl text-[10px] uppercase tracking-[0.25em] font-extrabold transition-all duration-300 border flex items-center justify-center gap-2
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-white hover:bg-luxury-gold hover:text-black hover:border-luxury-gold shadow-sm' 
                  : 'bg-luxury-offWhite border-luxury-gold/30 text-luxury-darkBlack hover:bg-luxury-gold hover:text-black hover:border-luxury-gold shadow-sm'
                }`}
            >
              <FiShoppingBag size={12} />
              <span>Add to Cart</span>
            </button>
          </div>

        </div>

      </div>
    </motion.div>
  )
}

function Home() {
  const { isDarkMode } = useTheme()
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // Custom states for category expander
  const [selectedCategory, setSelectedCategory] = useState('Men')
  const [selectedSubcategory, setSelectedSubcategory] = useState('All')
  const [filteredProducts, setFilteredProducts] = useState(mockProductsData)
  
  const timerRef = useRef(null)

  // Auto-scroll Hero slider
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 5500)
    return () => clearInterval(timerRef.current)
  }, [])

  // Filter products based on selected Category and Subcategory
  useEffect(() => {
    let result = mockProductsData.filter(p => p.category.toLowerCase().includes(selectedCategory.split(' ')[0].toLowerCase()))
    
    if (selectedSubcategory !== 'All') {
      result = result.filter(p => p.subcategory.toLowerCase() === selectedSubcategory.toLowerCase())
    }
    
    setFilteredProducts(result)
  }, [selectedCategory, selectedSubcategory])

  const goToSlide = (dir) => {
    clearInterval(timerRef.current)
    setCurrentSlide((prev) => (prev + dir + heroSlides.length) % heroSlides.length)
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 5500)
  }

  const slide = heroSlides[currentSlide]

  // Get currently expanded subcategories
  const currentSubcategories = mainCategories.find(c => c.name === selectedCategory)?.subcategories || []

  return (
    <div className="min-h-screen">
      
      {/* 1. HORIZONTALLY SCROLLABLE PREMIUM CATEGORY EXPANDER */}
      <section className={`py-4 border-b transition-all duration-300
        ${isDarkMode ? 'bg-luxury-black/40 border-white/5' : 'bg-luxury-offWhite/80 border-luxury-gold/15'}`}
      >
        <div className="container-custom">
          {/* Main Categories Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-1">
            {mainCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name)
                    setSelectedSubcategory('All')
                  }}
                  className={`whitespace-nowrap rounded-2xl px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 border
                    ${isSelected 
                      ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow' 
                      : isDarkMode ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' : 'bg-white border-black/5 text-luxury-darkBlack hover:bg-luxury-gold/10'}`}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>

          {/* Subcategories Horizontal Pill Drawer */}
          <div className={`mt-3 pt-3 border-t overflow-hidden ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
            <p className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold mb-2.5">
              Recommended for {selectedCategory}
            </p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
              <button
                type="button"
                onClick={() => setSelectedSubcategory('All')}
                className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-wider rounded-full px-4 py-2 transition
                  ${selectedSubcategory === 'All'
                    ? 'bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/40' 
                    : isDarkMode ? 'bg-white/5 text-white/60 hover:text-white border border-transparent' : 'bg-black/5 text-black/60 hover:text-black border border-transparent'}`}
              >
                All Collections
              </button>
              {currentSubcategories.map((sub) => {
                const isSubSelected = selectedSubcategory === sub
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubcategory(sub)}
                    className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-wider rounded-full px-4 py-2 transition border
                      ${isSubSelected
                        ? 'bg-luxury-gold text-black border-luxury-gold shadow-glow' 
                        : isDarkMode 
                          ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10' 
                          : 'bg-white border-black/10 text-slate-700 hover:bg-luxury-gold/5'}`}
                  >
                    {sub}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. CINEMATIC AUTO-SCROLLING HERO BANNER WITH PARALLAX */}
      <section className="relative h-[80vh] min-h-[550px] overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <img 
              src={slide.image} 
              alt={slide.title} 
              className="absolute inset-0 h-full w-full object-cover opacity-80" 
            />
            {/* Cinematic Gradient Mask */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.accent}`} />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 h-full">
          <div className="container-custom h-full flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-3xl"
            >
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-luxury-gold text-xs md:text-sm font-extrabold tracking-[0.4em] uppercase mb-4"
              >
                {slide.subtitle}
              </motion.p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-black leading-tight text-white whitespace-pre-line mb-6 shadow-sm">
                {slide.title}
              </h1>
              <p className="text-white/80 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
                {slide.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to={slide.link} 
                  className="inline-flex items-center gap-3 rounded-full bg-luxury-gold px-8 py-4 text-xs font-bold uppercase tracking-[0.25em] text-black transition hover:bg-luxury-darkGold shadow-glow"
                >
                  <span>{slide.cta}</span>
                  <FiArrowRight size={14} />
                </Link>
                <Link 
                  to="/products"
                  className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-xs font-bold uppercase tracking-[0.25em] text-white hover:bg-white/25 transition"
                >
                  <FiZap size={14} className="text-luxury-gold" />
                  <span>All Products</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Carousel Slider manual arrows */}
        <div className="absolute bottom-8 right-8 z-20 flex items-center gap-3">
          <button
            type="button"
            onClick={() => goToSlide(-1)}
            className="w-12 h-12 rounded-full border border-white/30 bg-black/40 text-white flex items-center justify-center hover:bg-luxury-gold hover:text-black hover:border-luxury-gold transition-all"
            aria-label="Previous couture view"
          >
            <FiChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => goToSlide(1)}
            className="w-12 h-12 rounded-full border border-white/30 bg-black/40 text-white flex items-center justify-center hover:bg-luxury-gold hover:text-black hover:border-luxury-gold transition-all"
            aria-label="Next couture view"
          >
            <FiChevronRight size={20} />
          </button>
        </div>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                clearInterval(timerRef.current)
                setCurrentSlide(idx)
              }}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentSlide ? 'w-10 bg-luxury-gold shadow-glow' : 'w-4 bg-white/40'}`}
            />
          ))}
        </div>
      </section>

      {/* 3. PREMIUM SERVICES / BRAND STATS STRIP */}
      <section className={`py-6 border-b transition-all duration-300
        ${isDarkMode ? 'bg-luxury-charcoal border-white/5' : 'bg-white border-black/5'}`}
      >
        <div className="container-custom">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {servicesList.map((item, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all
                  ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-luxury-offWhite border-luxury-gold/20'}`}
              >
                <div className="w-11 h-11 rounded-2xl bg-luxury-gold/10 flex items-center justify-center text-luxury-gold shadow-sm shrink-0">
                  <item.icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">{item.title}</h4>
                  <p className="text-[10px] opacity-60 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. DYNAMIC FEED - PERSONALIZED RECOMMENDATIONS */}
      <section className={`py-16 transition-colors duration-300 ${isDarkMode ? 'bg-[#090909]' : 'bg-[#fafafa]'}`}>
        <div className="container-custom">
          
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 text-luxury-gold mb-1">
                <FiZap />
                <p className="text-xs uppercase tracking-[0.3em] font-extrabold">Trending Now</p>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-black uppercase">
                {selectedSubcategory === 'All' ? 'Recommended For You' : `${selectedSubcategory} Collection`}
              </h2>
            </div>
            
            <Link 
              to="/products" 
              className="text-xs uppercase tracking-widest font-extrabold text-luxury-gold hover:text-luxury-lightGold flex items-center gap-1.5 transition-colors"
            >
              <span>View All Products</span>
              <FiArrowRight size={14} />
            </Link>
          </div>

          {/* Product grid with filtered list */}
          {filteredProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} isDarkMode={isDarkMode} />
              ))}
            </div>
          ) : (
            <div className={`text-center py-16 rounded-[2rem] border border-dashed p-8
              ${isDarkMode ? 'border-white/10 text-white/50' : 'border-black/10 text-slate-500'}`}>
              <FiZap size={40} className="mx-auto text-luxury-gold mb-3" />
              <p className="text-sm font-bold uppercase tracking-widest mb-1 text-luxury-gold">Loading Products...</p>
              <p className="text-xs opacity-60">We could not find items in {selectedSubcategory} right now. Please select another category above.</p>
            </div>
          )}

        </div>
      </section>

      {/* 5. TRENDING OUTFIT SUGGESTIONS / HIGH FASHION STORIES */}
      <section className={`py-16 transition-colors duration-300 border-t border-b
        ${isDarkMode ? 'bg-luxury-black border-white/5' : 'bg-white border-black/5'}`}
      >
        <div className="container-custom">
          
          <div className="text-center mb-12">
            <p className="text-luxury-gold text-xs uppercase tracking-[0.3em] font-bold mb-3">Trending Styles</p>
            <h2 className="text-3xl md:text-4xl font-serif font-black uppercase">Our Best Outfits</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { id: 'look1', title: 'Banarasi Silk Evening', subtitle: 'Royal handwoven silk saree with traditional matching jewelry', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', badge: 'Traditional' },
              { id: 'look2', title: 'Premium Velvet Blazer', subtitle: 'Classic charcoal velvet blazer paired with premium leather shoes', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', badge: 'Men Premium' },
              { id: 'look3', title: 'Activewear & Sneakers', subtitle: 'Stylish hoodies paired with matching sports sneakers', image: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=800&q=80', badge: 'Casual Wear' },
            ].map((look) => (
              <div 
                key={look.id} 
                className={`group relative overflow-hidden rounded-[2.2rem] border transition-all duration-500
                  ${isDarkMode ? 'border-white/10 hover:border-luxury-gold/40 shadow-dark-glow' : 'border-luxury-gold/20 hover:border-luxury-darkGold shadow-card'}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={look.image} 
                    alt={look.title} 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-6 flex flex-col justify-end">
                  <span className="self-start rounded-full bg-luxury-gold px-3.5 py-1 text-[9px] font-extrabold text-black uppercase tracking-widest mb-3 shadow-glow">
                    {look.badge}
                  </span>
                  <h3 className="text-white text-lg font-serif font-bold uppercase mb-2">{look.title}</h3>
                  <p className="text-white/70 text-xs leading-relaxed truncate-2-lines">{look.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. DESIGNER LABELS HIGHLIGHT */}
      <section className={`py-16 transition-colors duration-300 ${isDarkMode ? 'bg-[#060606]' : 'bg-[#f7f7f7]'}`}>
        <div className="container-custom">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
            <div>
              <p className="text-luxury-gold text-xs uppercase tracking-[0.3em] font-bold mb-2">Our Top Brands</p>
              <h2 className="text-3xl md:text-4xl font-serif font-black uppercase">SKLP Brand Partners</h2>
            </div>
            <p className="max-w-md text-xs opacity-65 leading-relaxed">
              Shop directly from India's finest handloom weavers and modern fashion brands.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {designerLabels.map((item, idx) => (
              <div 
                key={idx} 
                className={`rounded-[2rem] border p-8 text-center transition-all duration-300 hover:-translate-y-1
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-luxury-gold/50 shadow-dark-glow' 
                    : 'bg-white border-luxury-gold/25 hover:border-luxury-darkGold shadow-card'
                  }`}
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-luxury-gold font-bold mb-3 block">BRAND</span>
                <h3 className="text-xl font-serif font-bold uppercase mb-2">{item.brand}</h3>
                <p className="text-[11px] opacity-60 leading-normal">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. SECURE BRAND REASSURANCE / HISTORY FEED */}
      <section className={`py-16 transition-colors duration-300 ${isDarkMode ? 'bg-luxury-black' : 'bg-white'}`}>
        <div className="container-custom text-center max-w-4xl">
          <p className="text-luxury-gold text-xs uppercase tracking-[0.3em] font-bold mb-3">Authentic Quality</p>
          <h2 className="text-3xl md:text-5xl font-serif font-black uppercase mb-6">Uncompromising Standards</h2>
          <p className="text-sm opacity-70 leading-relaxed mb-8">
            Every garment sold on SKLP goes through a strict quality check process. Our Banarasi silks are 100% authentic with genuine certifications, ensuring the perfect fitting and absolute comfort in every single dress.
          </p>
          
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <FiShield size={16} className="text-luxury-gold" />
              <span className="text-[10px] uppercase tracking-widest font-bold">100% Verified</span>
            </div>
            <div className="w-[1px] h-4 bg-current/25" />
            <div className="flex items-center gap-2">
              <FiTruck size={16} className="text-luxury-gold" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Fast Delivery</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home
