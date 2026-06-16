import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  FiChevronDown, FiChevronLeft, FiHeart, FiShoppingBag, FiSettings, 
  FiZap, FiTrendingUp, FiHelpCircle, FiGlobe, FiMoon, FiSun, FiActivity, FiGift,
  FiGrid, FiPackage, FiUsers, FiBarChart2, FiTruck, FiMapPin, FiClipboard, FiDollarSign, FiPlusSquare, FiExternalLink
} from 'react-icons/fi'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { useWishlist } from '@context/WishlistContext'

const navSections = [
  {
    title: 'Browse Collections',
    titleKey: 'sidebar.browseCollections',
    items: [
      { label: 'Men\'s Fashion', labelKey: 'sidebar.mensFashion', link: '/products?gender=men' },
      { label: 'Women\'s Fashion', labelKey: 'sidebar.womensFashion', link: '/products?gender=women' },
      { label: 'Kids\' Corner', labelKey: 'sidebar.kidsCorner', link: '/products?gender=kids' },
      { label: 'Premium Footwear', labelKey: 'sidebar.premiumFootwear', link: '/products?category=footwear' },
      { label: 'Luxury Accessories', labelKey: 'sidebar.luxuryAccessories', link: '/products?category=accessories' },
      { label: 'Luxury Collections', labelKey: 'sidebar.luxuryCollections', link: '/products?tag=luxury' },
      { label: 'Trending Products', labelKey: 'sidebar.trendingProducts', link: '/products?sort=trending' },
      { label: 'New Arrivals', labelKey: 'sidebar.newArrivals', link: '/products?sort=new' },
      { label: 'Couture Offers', labelKey: 'sidebar.coutureOffers', link: '/products?offers=true' }
    ]
  },
  {
    title: 'Shopping Zone',
    titleKey: 'sidebar.shoppingZone',
    items: [
      { label: 'Trending Outfits', labelKey: 'sidebar.trendingProducts', link: '/products?sort=trending', icon: <FiZap className="text-luxury-gold mr-2" /> },
      { label: 'Special Offers', labelKey: 'sidebar.specialOffers', link: '/products?offers=true', icon: <FiGift className="text-luxury-gold mr-2" /> },
      { label: 'Recommended For You', labelKey: 'sidebar.recommendedForYou', link: '/products', icon: <FiHeart className="text-luxury-gold mr-2" /> },
      { label: 'New Arrivals', labelKey: 'sidebar.newArrivals', link: '/products?sort=new', icon: <FiSparklesIcon className="text-luxury-gold mr-2" /> }
    ]
  },
  {
    title: 'Client Services',
    titleKey: 'sidebar.clientServices',
    items: [
      { label: 'My Wishlist', labelKey: 'sidebar.myWishlist', link: '/wishlist', icon: <FiHeart className="text-luxury-gold mr-2" /> },
      { label: 'Order Tracking', labelKey: 'sidebar.orderTracking', link: '/orders', icon: <FiShoppingBag className="text-luxury-gold mr-2" /> },
      { label: 'Customer Support', labelKey: 'sidebar.customerSupport', link: '/contact', icon: <FiHelpCircle className="text-luxury-gold mr-2" /> },
      { label: 'Settings', labelKey: 'sidebar.settings', link: '/profile', icon: <FiSettings className="text-luxury-gold mr-2" /> }
    ]
  }
]

// Simple helper icon for AI features
function FiSparklesIcon({ className }) {
  return (
    <svg 
      className={className} 
      stroke="currentColor" 
      fill="none" 
      strokeWidth="2" 
      viewBox="0 0 24 24" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      height="1em" 
      width="1em" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
    </svg>
  )
}

// Role-specific dashboard paths
const ROLE_DASHBOARD = {
  admin: '/admin/dashboard',
  seller: '/seller/dashboard',
  delivery: '/delivery/dashboard',
  deliveryPartner: '/delivery/dashboard',
  customer: '/profile',
}

function Sidebar({ isOpen, onClose }) {
  const { isAuthenticated, user, logout } = useAuth()
  const { isDarkMode, toggleTheme, language, changeLanguage } = useTheme()
  const { wishlistCount } = useWishlist()
  const { t } = useTranslation()
  const [expandedSection, setExpandedSection] = useState(0)

  // Build dynamic sections based on role
  const roleSections = useMemo(() => {
    if (!isAuthenticated || !user?.role) return []
    const role = user.role

    if (role === 'admin') {
      return [{
        title: '⚙️ Admin Management',
        titleKey: 'sidebar.adminManagement',
        items: [
          { label: 'Admin Dashboard',    labelKey: 'sidebar.adminDashboard',    link: '/admin/dashboard',  icon: <FiGrid className="text-luxury-gold mr-2" /> },
          { label: 'Manage Products',    labelKey: 'sidebar.manageProducts',    link: '/admin/products',   icon: <FiPackage className="text-luxury-gold mr-2" /> },
          { label: 'Manage Orders',      labelKey: 'sidebar.manageOrders',      link: '/admin/orders',     icon: <FiClipboard className="text-luxury-gold mr-2" /> },
          { label: 'Manage Users',       labelKey: 'sidebar.manageUsers',       link: '/admin/users',      icon: <FiUsers className="text-luxury-gold mr-2" /> },
          { label: 'Analytics Overview', labelKey: 'sidebar.analyticsOverview', link: '/admin/dashboard',  icon: <FiBarChart2 className="text-luxury-gold mr-2" /> },
        ]
      }]
    }

    if (role === 'seller') {
      return [{
        title: '🏪 Seller Hub',
        titleKey: 'sidebar.sellerHub',
        items: [
          { label: 'Seller Dashboard',   labelKey: 'sidebar.sellerDashboard', link: '/seller/dashboard', icon: <FiGrid className="text-luxury-gold mr-2" /> },
          { label: 'My Products',        labelKey: 'sidebar.myProducts',      link: '/seller/dashboard', icon: <FiPackage className="text-luxury-gold mr-2" /> },
          { label: 'Add New Product',    labelKey: 'sidebar.addNewProduct',   link: '/seller/dashboard', icon: <FiPlusSquare className="text-luxury-gold mr-2" /> },
          { label: 'Earnings & Payouts', labelKey: 'sidebar.earningsPayouts', link: '/seller/dashboard', icon: <FiDollarSign className="text-luxury-gold mr-2" /> },
          { label: 'Sales Analytics',    labelKey: 'sidebar.salesAnalytics',  link: '/seller/dashboard', icon: <FiBarChart2 className="text-luxury-gold mr-2" /> },
        ]
      }]
    }

    if (role === 'delivery' || role === 'deliveryPartner') {
      return [{
        title: '🚚 Delivery Hub',
        titleKey: 'sidebar.deliveryHub',
        items: [
          { label: 'Delivery Dashboard', labelKey: 'sidebar.deliveryDashboard', link: '/delivery/dashboard', icon: <FiTruck className="text-luxury-gold mr-2" /> },
          { label: 'Active Deliveries',  labelKey: 'sidebar.activeDeliveries',  link: '/delivery/dashboard', icon: <FiMapPin className="text-luxury-gold mr-2" /> },
          { label: 'Route Map',          labelKey: 'sidebar.routeMap',          link: '/delivery/dashboard', icon: <FiActivity className="text-luxury-gold mr-2" /> },
          { label: 'Earnings Today',     labelKey: 'sidebar.earningsToday',     link: '/delivery/dashboard', icon: <FiDollarSign className="text-luxury-gold mr-2" /> },
          { label: 'OTP Verification',   labelKey: 'sidebar.otpVerification',   link: '/delivery/dashboard', icon: <FiClipboard className="text-luxury-gold mr-2" /> },
        ]
      }]
    }

    return []
  }, [isAuthenticated, user])

  // All sections: role-based first, then public
  const allSections = useMemo(() => [...roleSections, ...navSections], [roleSections])
  const touchStartX = useRef(0)

  // Prevent background scrolling when sidebar is active
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX
  }

  const handleTouchEnd = (event) => {
    const touchEndX = event.changedTouches[0].clientX
    // Swipe left (negative difference) of over 60px closes the drawer
    if (touchStartX.current - touchEndX > 60) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          
          {/* BACKDROP: Fades in and out, close on click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* DRAWER BODY: Slides from Left */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`absolute inset-y-0 left-0 w-[90vw] max-w-sm flex flex-col border-r shadow-2xl backdrop-blur-2xl transition-all duration-300
              ${isDarkMode 
                ? 'bg-luxury-black/95 border-white/10 text-white' 
                : 'bg-white/95 border-luxury-gold/25 text-luxury-darkBlack'
              }`}
          >
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-luxury-gold font-bold mb-0.5">SKLP</p>
                <h2 className="text-xl font-serif font-extrabold tracking-wide uppercase">Fashion Store</h2>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className={`p-2.5 rounded-xl border transition-all
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-luxury-gold' 
                    : 'bg-luxury-gold/10 border-luxury-gold/20 hover:bg-luxury-gold/25 text-luxury-darkBlack'
                  }`}
              >
                <FiChevronLeft size={20} />
              </button>
            </div>

            {/* Divider */}
            <div className={`mx-6 border-b ${isDarkMode ? 'border-white/10' : 'border-black/5'}`} />

            {/* Main content scroll container */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin">
              
              {/* User Greeting Panel */}
              <div className={`rounded-3xl border p-5 shadow-sm transition-all
                ${isDarkMode 
                  ? 'bg-white/5 border-white/10 shadow-dark-glow' 
                  : 'bg-luxury-offWhite border-luxury-gold/20 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-luxury-gold font-bold">
                      {isAuthenticated ? (
                        <span className="capitalize">{user?.role || 'Member'}</span>
                      ) : t('sidebar.welcomeGuest', 'Welcome Guest')}
                    </p>
                    <p className="mt-1 text-sm font-semibold truncate max-w-[150px]">
                      {isAuthenticated ? `${user?.firstName || 'SKLP'} ${user?.lastName || ''}` : t('sidebar.sklpFashionStore', 'SKLP Fashion Store')}
                    </p>
                    {isAuthenticated && user?.role && ROLE_DASHBOARD[user.role] && (
                      <Link
                        to={ROLE_DASHBOARD[user.role]}
                        onClick={onClose}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-luxury-gold uppercase tracking-widest hover:underline"
                      >
                        <FiExternalLink size={10} /> {t('sidebar.goToDashboard', 'Go to Dashboard')}
                      </Link>
                    )}
                  </div>
                  
                  {/* Action icons: Theme & Language */}
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={toggleTheme} 
                      className={`p-2.5 rounded-xl border transition-all duration-300
                        ${isDarkMode ? 'bg-luxury-gold text-black border-luxury-gold/40' : 'bg-black text-luxury-gold border-black'}`}
                    >
                      {isDarkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
                    </button>
                    <div className={`p-2.5 rounded-xl border flex items-center justify-center ${isDarkMode ? 'bg-white/10 border-white/10 text-luxury-gold' : 'bg-black/5 border-black/5 text-luxury-darkBlack'}`}>
                      <FiGlobe size={15} />
                    </div>
                  </div>
                </div>

                {/* Multi-language Selector */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-current/10 text-xs">
                  {[
                    { code: 'en', name: 'English' },
                    { code: 'te', name: 'తెలుగు' },
                    { code: 'hi', name: 'हिन्दी' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => changeLanguage(lang.code)}
                      className={`px-3 py-1.5 rounded-full transition font-semibold
                        ${language === lang.code 
                          ? 'bg-luxury-gold text-black shadow-glow' 
                          : isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/5 text-black hover:bg-black/10'}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Nav Sections — role-based first, then public */}
              <div className="space-y-3">
                {allSections.map((section, sectionIndex) => (
                  <div 
                    key={section.title} 
                    className={`rounded-2xl border p-4 transition-all
                      ${sectionIndex < roleSections.length
                        ? isDarkMode 
                          ? 'bg-luxury-gold/10 border-luxury-gold/30'
                          : 'bg-luxury-gold/8 border-luxury-gold/25'
                        : isDarkMode 
                          ? 'bg-white/5 border-white/10' 
                          : 'bg-luxury-offWhite border-luxury-gold/15'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === sectionIndex ? null : sectionIndex)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className={`font-bold text-sm uppercase tracking-wider ${sectionIndex < roleSections.length ? 'text-luxury-gold' : ''}`}>
                        {t(section.titleKey || section.title, section.title)}
                      </span>
                      <FiChevronDown 
                        className={`transition-transform duration-300 ${expandedSection === sectionIndex ? 'rotate-180 text-luxury-gold' : ''}`} 
                      />
                    </button>
                    
                    {/* Collapsible children */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 
                        ${expandedSection === sectionIndex ? 'max-h-[400px] opacity-100 mt-4 space-y-2' : 'max-h-0 opacity-0'}`}
                    >
                      {section.items.map((item) => (
                        <Link
                          key={item.label}
                          to={item.link}
                          onClick={onClose}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors
                            ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-luxury-gold/10 text-slate-800'}`}
                        >
                          {item.icon || <FiTrendingUp className="text-luxury-gold mr-2" />}
                          <span>{t(item.labelKey || item.label, item.label)}</span>
                          
                          {/* Live count badges */}
                          {item.label === 'My Wishlist' && wishlistCount > 0 && (
                            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white">
                              {wishlistCount}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Brand highlights info card */}
              <div className={`rounded-3xl border p-5 transition-all
                ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-luxury-offWhite border-luxury-gold/10'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <FiZap className="text-luxury-gold animate-bounce" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-luxury-gold">{t('sidebar.loyaltyClub', 'SKLP Rewards Club')}</h3>
                </div>
                <p className="text-xs opacity-70 leading-relaxed mb-4">
                  {t('sidebar.loyaltyClubText', 'Enjoy free fast delivery, custom fittings, and early access to new festive arrivals.')}
                </p>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-luxury-gold">
                  <span>{t('sidebar.eliteTier', 'Gold Member')}</span>
                  <FiGift size={16} />
                </div>
              </div>

            </div>

            {/* Chatbot trigger */}
            <div className="px-6 mb-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  window.dispatchEvent(new CustomEvent('open-chatbot'))
                }}
                className="w-full py-3 bg-luxury-gold/15 text-luxury-gold hover:bg-luxury-gold hover:text-black border border-luxury-gold/30 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
              >
                💬 Chat Bot
              </button>
            </div>

            {/* Bottom Panel Profile Actions */}
            <div className={`p-6 border-t ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    window.location.assign('/login')
                  }}
                  className="w-full rounded-2xl bg-red-500 text-white px-4 py-3 text-sm font-bold tracking-widest uppercase transition hover:bg-red-600 shadow-md"
                >
                  {t('sidebar.signOut', 'Sign Out')}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={onClose}
                  className="block text-center rounded-2xl bg-luxury-gold text-black px-4 py-3 text-sm font-extrabold tracking-widest uppercase transition hover:bg-luxury-darkGold shadow-glow"
                >
                  {t('sidebar.enterAtelier', 'Sign In')}
                </Link>
              )}
            </div>

          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Sidebar
