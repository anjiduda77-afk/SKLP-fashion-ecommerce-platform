import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  FiSearch, FiShoppingCart, FiHeart, FiUser, 
  FiSun, FiMoon, FiMic, FiX, FiArrowRight,
  FiZap
} from 'react-icons/fi'
import { useCart } from '@context/CartContext'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { useWishlist } from '@context/WishlistContext'
import Sidebar from '@components/Common/Sidebar'
import sklpLogo from '@assets/images/sklp_logo.png'

const searchMockData = {
  trending: [
    { query: 'Gold Banarasi Silk Saree', category: 'Women' },
    { query: 'Velvet Evening Blazer', category: 'Men' },
    { query: 'Gold Trim Sneakers', category: 'Footwear' },
    { query: 'Leather Designer Tote', category: 'Accessories' }
  ],
  recommended: [
    { name: 'Embroidered Velvet Sherwani', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=80&q=80', price: '₹18,999' },
    { name: 'Royal Banarasi Silk Saree', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=80&q=80', price: '₹24,500' }
  ],
  typos: {
    'sre': 'Saree',
    'sar': 'Saree',
    'shrt': 'Shirt',
    'sneker': 'Sneakers',
    'blazr': 'Blazer',
    'watc': 'Watches'
  }
}

function Header({ isDarkMode }) {
  const { t } = useTranslation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { itemCount } = useCart()
  const { wishlistCount } = useWishlist()
  const { isAuthenticated, user, logout } = useAuth()
  const { toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Track scrolling to toggle sticky header floating shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close search with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsSearchOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Simple Typo Correction logic
  const correctedTypo = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return null
    return searchMockData.typos[query] || null
  }, [searchQuery])

  // Predictive search filter
  const predictedSearches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    const allOptions = [
      'Gold Banarasi Silk Saree', 'Velvet Evening Blazer', 'Gold Trim Sneakers', 'Leather Designer Tote',
      'Premium Linen Shirt', 'Soft Denim Dungarees', 'Italian Oxford Boots', 'Luxe Sport Hoodie'
    ]
    return allOptions.filter(item => item.toLowerCase().includes(query))
  }, [searchQuery])

  // Simulated Voice Search
  const handleVoiceSearch = () => {
    setIsListening(true)
    setTimeout(() => {
      const simulatedSpeeches = [
        'Gold Banarasi Silk Saree',
        'Velvet Evening Blazer',
        'Gold Trim Sneakers'
      ]
      const randomSpeech = simulatedSpeeches[Math.floor(Math.random() * simulatedSpeeches.length)]
      setSearchQuery(randomSpeech)
      setIsListening(false)
    }, 2000)
  }

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearchOpen(false)
    }
  }

  return (
    <>
      <header className={`sticky top-0 z-40 transition-all duration-500 border-b 
        ${isScrolled 
          ? 'py-2.5 backdrop-blur-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]' 
          : 'py-4 backdrop-blur-xl'
        } 
        ${isDarkMode 
          ? 'bg-luxury-black/85 border-luxury-gold/10 text-white' 
          : 'bg-white/90 border-luxury-gold/20 text-luxury-darkBlack'
        }`}
      >
        <div className="container-custom flex items-center justify-between gap-4">
          
          {/* LEFT: Hamburger & Brand logo */}
          <div className="flex items-center gap-3 md:gap-5">
            {/* Professional Animated Hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`relative flex flex-col items-center justify-center w-11 h-11 rounded-2xl border transition-all duration-300 group
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-luxury-gold' 
                  : 'bg-luxury-gold/10 border-luxury-gold/20 hover:bg-luxury-gold/25 text-luxury-darkBlack'
                }`}
              aria-label="Open sidebar menu"
            >
              <span className="w-5 h-[2px] bg-current rounded-full transition-transform duration-300 translate-y-[-4px] group-hover:scale-x-110" />
              <span className="w-5 h-[2px] bg-current rounded-full transition-all duration-300" />
              <span className="w-5 h-[2px] bg-current rounded-full transition-transform duration-300 translate-y-[4px] group-hover:scale-x-95" />
            </button>

            {/* Premium Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src={sklpLogo} 
                alt="SKLP Logo" 
                className="w-10 h-10 object-contain rounded-xl"
              />
              <div className="hidden sm:block">
                <p className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  SKLP Fashion Store
                </p>
              </div>
            </Link>
          </div>

          {/* MIDDLE: Hidden Search Container on Desktop unless activated */}
          <div className="hidden md:flex flex-1 max-w-lg items-center relative">
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl border text-left text-sm transition-all duration-300
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10' 
                  : 'bg-luxury-offWhite border-luxury-gold/20 text-luxury-mediumGray hover:text-luxury-darkGray hover:border-luxury-gold/45'
                }`}
            >
              <FiSearch className="text-luxury-gold text-lg" />
              <span>{t('header.searchPlaceholder', 'Search premium collections, AI styles...')}</span>
              <span className="ml-auto text-[10px] bg-luxury-gold/20 text-luxury-gold px-2 py-0.5 rounded-md font-mono">
                ⌘K
              </span>
            </button>
          </div>

          {/* RIGHT: Top Navigation Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            
            {/* Search Toggle Icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' 
                  : 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/25'
                }`}
              aria-label="Expand Search"
            >
              <FiSearch size={20} />
            </button>

            {/* Theme Toggle Icon with smooth micro-animation */}
            <button
              onClick={toggleTheme}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300 active:scale-95
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' 
                  : 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/25'
                }`}
              aria-label="Toggle theme mode"
            >
              {isDarkMode ? (
                <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                  <FiSun size={18} className="text-luxury-gold" />
                </motion.div>
              ) : (
                <motion.div whileTap={{ rotate: 90 }} transition={{ duration: 0.3 }}>
                  <FiMoon size={18} className="text-luxury-darkBlack" />
                </motion.div>
              )}
            </button>

            {/* Wishlist Synchronized Badge */}
            <Link 
              to="/wishlist" 
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' 
                  : 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/25'
                }`}
            >
              <FiHeart size={20} />
              <AnimatePresence>
                {wishlistCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white shadow-lg"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Cart Synchronized Badge */}
            <Link 
              to="/cart" 
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' 
                  : 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/25'
                }`}
            >
              <FiShoppingCart size={20} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-luxury-gold px-1.5 text-[9px] font-bold text-black shadow-glow"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Desktop profile login option */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                {user?.role && user.role !== 'customer' && (
                  <Link
                    to={
                      user.role === 'admin'
                        ? '/admin/dashboard'
                        : user.role === 'seller'
                        ? '/seller/dashboard'
                        : '/delivery/dashboard'
                    }
                    className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 bg-luxury-gold text-black border-luxury-gold hover:bg-yellow-400 hover:shadow-glow`}
                  >
                    <FiZap size={14} className="animate-pulse" />
                    <span>
                      {user.role === 'admin'
                        ? 'Admin Panel'
                        : user.role === 'seller'
                        ? 'Seller Hub'
                        : 'Delivery Hub'}
                    </span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300
                    ${isDarkMode 
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                      : 'bg-white border-luxury-gold/30 text-black hover:bg-luxury-offWhite'
                    }`}
                >
                  <FiUser size={16} className={isDarkMode ? 'text-luxury-gold' : 'text-luxury-darkBlack'} />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-md"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className={`hidden md:inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                    : 'bg-luxury-gold text-black border-luxury-gold/40 hover:bg-luxury-darkGold'
                  }`}
              >
                <FiUser size={16} className={isDarkMode ? 'text-luxury-gold' : 'text-black'} />
                <span>Sign In</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {/* FULL WIDTH AI SEARCH OVERLAY */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-start p-4 pt-16 md:pt-24"
          >
            {/* Search Modal container */}
            <motion.div
              initial={{ y: -50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`w-full max-w-4xl mx-auto rounded-[2rem] border overflow-hidden shadow-2xl p-6 md:p-8 relative
                ${isDarkMode 
                  ? 'bg-luxury-black border-white/10 text-white shadow-dark-glow' 
                  : 'bg-white border-luxury-gold/30 text-luxury-darkBlack shadow-hover'
                }`}
            >
              {/* Header inside search modal */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FiZap className="text-luxury-gold animate-pulse" />
                  <span className="text-xs uppercase tracking-[0.3em] text-luxury-gold font-bold">{t('header.predictiveAi', 'SKLP Smart Search')}</span>
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className={`p-2.5 rounded-full border transition-all
                    ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-luxury-offWhite hover:bg-luxury-lightGray'}`}
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Form Input with Mic inside search */}
              <form onSubmit={handleSearchSubmit} className="relative mb-6">
                <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 md:py-4
                  ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-luxury-offWhite border-luxury-gold/30'}`}>
                  <FiSearch className="text-luxury-gold text-xl" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('header.inputPlaceholder', 'Enter what you desire (e.g. Silk Sarees, leather shoes, AI outfit planner)...')}
                    className="w-full bg-transparent text-base outline-none focus:ring-0 border-0 p-0 text-current placeholder:text-current/40"
                    autoFocus
                  />
                  
                  {/* Voice Trigger with Listening micro-animation */}
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    className={`relative p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center
                      ${isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : isDarkMode ? 'bg-white/10 text-luxury-gold hover:bg-white/20' : 'bg-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/30'}`}
                    title="Voice Search"
                  >
                    <FiMic size={18} />
                    {isListening && (
                      <span className="absolute -inset-1 rounded-xl border border-red-500 animate-ping opacity-75" />
                    )}
                  </button>
                </div>
              </form>

              {/* Typo Suggestion alerts */}
              {correctedTypo && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 flex items-center gap-2 text-sm text-luxury-gold bg-luxury-gold/10 px-4 py-2.5 rounded-xl border border-luxury-gold/20"
                >
                  <FiZap />
                  <span>{t('header.didYouMean', 'Did you mean:')}</span>
                  <button 
                    type="button"
                    onClick={() => setSearchQuery(correctedTypo)} 
                    className="font-bold underline uppercase tracking-wider text-luxury-gold hover:text-luxury-lightGold"
                  >
                    {correctedTypo}
                  </button>
                </motion.div>
              )}

              {/* Suggestions Grid */}
              <div className="grid gap-6 md:grid-cols-3 mt-4">
                
                {/* Predictive Searches */}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold text-luxury-gold">{t('header.predictiveMatches', 'Predictive Matches')}</p>
                  <div className="flex flex-col gap-2">
                    {searchQuery ? (
                      predictedSearches.length > 0 ? (
                        predictedSearches.map(item => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setSearchQuery(item)}
                            className={`w-full text-left text-sm rounded-xl p-3 border transition-colors
                              ${isDarkMode ? 'border-white/5 hover:bg-white/5 text-white' : 'border-black/5 hover:bg-black/5 text-slate-800'}`}
                          >
                            {item}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs opacity-60">No predictive matches. Try typing 'saree' or 'blazer'.</p>
                      )
                    ) : (
                      searchMockData.trending.map(item => (
                        <button
                          key={item.query}
                          type="button"
                          onClick={() => setSearchQuery(item.query)}
                          className={`w-full text-left text-sm rounded-xl p-3 border transition-colors flex items-center justify-between
                            ${isDarkMode ? 'border-white/5 hover:bg-white/5 text-white' : 'border-black/5 hover:bg-black/5 text-slate-800'}`}
                        >
                          <span>{item.query}</span>
                          <span className="text-[10px] opacity-50 uppercase tracking-widest">{item.category}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Visual previews */}
                <div className="space-y-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold text-luxury-gold">{t('header.aiRecommended', 'Recommended Products')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {searchMockData.recommended.map((prod, idx) => (
                      <Link
                        key={idx}
                        to="/products"
                        onClick={() => setIsSearchOpen(false)}
                        className={`flex items-center gap-3 rounded-xl border p-3 hover:border-luxury-gold/50 transition-all
                          ${isDarkMode ? 'border-white/5 bg-white/5 text-white' : 'border-black/5 bg-luxury-offWhite text-slate-800'}`}
                      >
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          className="w-12 h-16 object-cover rounded-lg border border-white/10" 
                        />
                        <div>
                          <h4 className="text-sm font-semibold truncate max-w-[150px]">{prod.name}</h4>
                          <p className="text-xs text-luxury-gold font-bold mt-1">{prod.price}</p>
                          <span className="text-[9px] uppercase tracking-wider text-green-500 font-bold block mt-0.5">Best Seller</span>
                        </div>
                        <FiArrowRight className="ml-auto text-luxury-gold text-lg animate-pulse" />
                      </Link>
                    ))}
                  </div>
                </div>

              </div>
              
              {/* Voice Listening Overlay simulation status */}
              <AnimatePresence>
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/95 rounded-[2rem] flex flex-col items-center justify-center p-6 text-center text-white z-50"
                  >
                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white mb-4 animate-bounce">
                      <FiMic size={36} />
                    </div>
                    <h3 className="text-xl font-bold font-serif mb-2 text-white">{t('header.listening', 'Listening for luxury selections...')}</h3>
                    <p className="text-sm text-white/70 max-w-sm mb-4">{t('header.listeningInstructions', 'Speak clearly into your microphone. Say something like "Velvet blazer" or "Silk saree".')}</p>
                    <div className="flex gap-1.5 items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-luxury-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-luxury-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-luxury-gold animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-out Sidebar Drawer Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  )
}

export default Header
