import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  FiSearch, FiShoppingCart, FiHeart, FiUser, 
  FiMic, FiArrowRight,
  FiZap, FiChevronDown, FiBell
} from 'react-icons/fi'
import { RiStore2Line } from 'react-icons/ri'
import { useCart } from '@context/CartContext'
import { useAuth } from '@context/AuthContext'
import { useWishlist } from '@context/WishlistContext'
import { useShop } from '@context/ShopContext'
import { notificationService } from '@services/apiServices'
import { onForegroundMessage } from '@config/firebase'
import Sidebar from '@components/Common/Sidebar'
import SearchModal from '@components/Search/SearchModal'
import sklpLogo from '@assets/images/sklp_logo.png'

function Header({ isDarkMode }) {
  const { t } = useTranslation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { itemCount } = useCart()
  const { wishlistCount } = useWishlist()
  const { isAuthenticated, user } = useAuth()
  const { selectedShop, openShopModal } = useShop()
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

  // Sync notifications and listen for foreground push messages
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const fetchNotifs = () => {
      notificationService.getNotifications({ limit: 5 })
        .then((res) => {
          if (res.data?.notifications) {
            setNotifications(res.data.notifications)
            setUnreadCount(res.data.unreadCount || 0)
          }
        })
        .catch(() => {})
    }

    fetchNotifs()

    const unsubscribe = onForegroundMessage(() => {
      fetchNotifs()
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [isAuthenticated])


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
        <div className="container-custom flex flex-col gap-2.5">
          
          {/* TOP ROW: Brand, Shop, Theme, Lang, Cart, Wishlist, Profile */}
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* LEFT: Hamburger & Brand logo */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Professional Animated Hamburger */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`relative flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border transition-all duration-300 group touch-target
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
              <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                <img 
                  src={sklpLogo} 
                  alt="SKLP Logo" 
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl shadow-sm"
                />
                <div className="flex flex-col">
                  <p className={`text-xs sm:text-sm font-serif font-black tracking-wider leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    SKLP <span className="text-luxury-gold">LUXE</span>
                  </p>
                  <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold hidden xs:block">
                    Fashion Store
                  </span>
                </div>
              </Link>
            </div>

            {/* MIDDLE: Desktop-Only Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg items-center relative mx-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-left text-sm transition-all duration-300
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10' 
                    : 'bg-luxury-offWhite border-luxury-gold/20 text-luxury-mediumGray hover:text-luxury-darkGray hover:border-luxury-gold/45'
                  }`}
              >
                <FiSearch className="text-luxury-gold text-lg shrink-0" />
                <span className="truncate">
                  {selectedShop 
                    ? `Search in ${selectedShop.brandName || selectedShop.shopName}...`
                    : t('header.searchPlaceholder', 'Search luxury couture, brands...')}
                </span>
                <span className="ml-auto text-[10px] bg-luxury-gold/20 text-luxury-gold px-2 py-0.5 rounded-md font-mono shrink-0">
                  ⌘K
                </span>
              </button>
            </div>

            {/* RIGHT: Quick Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Shop / Brand Selector Pill */}
              <button
                onClick={openShopModal}
                className={`h-9 sm:h-10 px-2 sm:px-3 rounded-xl sm:rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition-all duration-300 ${
                  selectedShop
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-glow'
                    : isDarkMode
                    ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10 hover:border-luxury-gold/40'
                    : 'bg-luxury-gold/10 border-luxury-gold/30 text-luxury-darkBlack hover:bg-luxury-gold/25'
                }`}
                title="Choose a Shop / Brand"
              >
                {selectedShop?.logo?.url ? (
                  <img
                    src={selectedShop.logo.url}
                    alt={selectedShop.brandName || selectedShop.shopName}
                    className="w-4 h-4 rounded-full object-cover border border-amber-400/50 shrink-0"
                  />
                ) : (
                  <RiStore2Line size={16} className="text-luxury-gold shrink-0" />
                )}
                <span className="max-w-[70px] sm:max-w-[100px] truncate text-[11px] sm:text-xs">
                  {selectedShop ? (selectedShop.brandName || selectedShop.shopName) : t('header.allShops', 'Brands')}
                </span>
                <FiChevronDown size={12} className="text-luxury-gold opacity-80 shrink-0" />
              </button>

              {/* Notifications Popover Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all duration-300 touch-target active:scale-95 ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' 
                      : 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/25'
                  }`}
                  aria-label="Notifications"
                >
                  <FiBell size={18} />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-black shadow-glow"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                {/* Notifications Dropdown Panel */}
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsNotificationsOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl border p-4 shadow-2xl z-50 backdrop-blur-2xl ${
                          isDarkMode 
                            ? 'bg-[#0f0f0f]/95 border-white/15 text-white shadow-black/80' 
                            : 'bg-white/95 border-gray-200 text-gray-900 shadow-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-current/10">
                          <div className="flex items-center gap-2">
                            <FiBell className="text-amber-500" />
                            <span className="font-bold text-xs uppercase tracking-wider font-serif">Notifications</span>
                          </div>
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={async () => {
                                await notificationService.markAllAsRead()
                                setUnreadCount(0)
                                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                              }}
                              className="text-[10px] text-amber-500 font-bold hover:underline"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>

                        <div className="py-2 space-y-2 max-h-72 overflow-y-auto pr-1">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div
                                key={n._id}
                                onClick={() => {
                                  if (!n.isRead) {
                                    notificationService.markAsRead(n._id).catch(() => {})
                                    setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item))
                                    setUnreadCount(c => Math.max(0, c - 1))
                                  }
                                  if (n.actionUrl) {
                                    navigate(n.actionUrl)
                                    setIsNotificationsOpen(false)
                                  }
                                }}
                                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                                  n.isRead
                                    ? isDarkMode ? 'border-white/5 bg-white/5 opacity-60' : 'border-gray-100 bg-gray-50 opacity-70'
                                    : isDarkMode ? 'border-amber-500/30 bg-amber-500/10 shadow-sm' : 'border-amber-400/40 bg-amber-50 shadow-sm'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-bold text-xs text-amber-500">{n.title}</p>
                                  <span className="text-[9px] opacity-50 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[11px] opacity-80 line-clamp-2 leading-relaxed">{n.message}</p>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-xs opacity-50 space-y-2">
                              <FiBell className="mx-auto opacity-40 text-amber-500" size={24} />
                              <p>No notifications yet</p>
                              <p className="text-[10px] opacity-75">You will receive alerts for orders and private couture drops.</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-current/10 text-center">
                          <Link
                            to="/profile"
                            onClick={() => setIsNotificationsOpen(false)}
                            className="text-[10px] uppercase font-bold text-amber-500 tracking-wider hover:underline inline-flex items-center gap-1"
                          >
                            <span>Notification Preferences</span>
                            <FiArrowRight size={10} />
                          </Link>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Wishlist Synchronized Badge */}
              <Link 
                to="/wishlist" 
                className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all duration-300 touch-target
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' 
                    : 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/25'
                  }`}
                aria-label="Wishlist"
              >
                <FiHeart size={18} />
                <AnimatePresence>
                  {wishlistCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white shadow-lg"
                    >
                      {wishlistCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Cart Synchronized Badge */}
              <Link 
                to="/cart" 
                className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all duration-300 touch-target
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' 
                    : 'bg-luxury-gold/10 border-luxury-gold/20 text-luxury-darkBlack hover:bg-luxury-gold/25'
                  }`}
                aria-label="Cart"
              >
                <FiShoppingCart size={18} />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-luxury-gold px-1 text-[8px] font-bold text-black shadow-glow"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Authentication States */}
              {isAuthenticated ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {user?.role && user.role !== 'customer' && (
                    <Link
                      to={
                        user.role === 'admin'
                          ? '/admin/dashboard'
                          : user.role === 'seller'
                          ? '/seller/dashboard'
                          : '/delivery/dashboard'
                      }
                      className="hidden lg:inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 bg-luxury-gold text-black border-luxury-gold hover:bg-yellow-400 hover:shadow-glow"
                    >
                      <FiZap size={14} className="animate-pulse" />
                      <span>
                        {user.role === 'admin'
                          ? t('header.adminPanel', 'Admin')
                          : user.role === 'seller'
                          ? t('header.sellerHub', 'Seller')
                          : t('header.deliveryHub', 'Delivery')}
                      </span>
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className={`w-9 h-9 sm:w-10 sm:h-10 sm:px-3 sm:w-auto rounded-xl sm:rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 touch-target
                      ${isDarkMode 
                        ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                        : 'bg-white border-luxury-gold/30 text-black hover:bg-luxury-offWhite'
                      }`}
                    title="Account Profile"
                  >
                    <FiUser size={16} className={isDarkMode ? 'text-luxury-gold' : 'text-luxury-darkBlack'} />
                    <span className="hidden xl:inline-block">{t('header.profile', 'Profile')}</span>
                  </Link>

                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className={`w-9 h-9 sm:w-auto sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 touch-target
                    ${isDarkMode 
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                      : 'bg-luxury-gold text-black border-luxury-gold/40 hover:bg-luxury-darkGold'
                    }`}
                >
                  <FiUser size={15} className={isDarkMode ? 'text-luxury-gold' : 'text-black'} />
                  <span className="hidden sm:inline-block">{t('header.signIn', 'Sign In')}</span>
                </button>
              )}

            </div>
          </div>

          {/* SECOND ROW (Mobile & Tablet): Full-Width Dedicated Search Bar */}
          <div className="md:hidden w-full">
            <div 
              onClick={() => setIsSearchOpen(true)}
              className={`w-full h-11 px-3.5 rounded-2xl border flex items-center gap-2.5 text-xs transition-all cursor-pointer shadow-sm touch-target ${
                isDarkMode 
                  ? 'bg-white/5 border-white/10 text-white/70 hover:border-luxury-gold/40' 
                  : 'bg-luxury-offWhite border-luxury-gold/30 text-gray-700 hover:border-luxury-gold/60'
              }`}
            >
              <FiSearch className="text-luxury-gold text-base shrink-0" />
              <span className="truncate flex-1 text-left">
                {selectedShop 
                  ? `Search in ${selectedShop.brandName || selectedShop.shopName}...`
                  : t('header.searchPlaceholder', 'Search products, brands, couture...')}
              </span>
              {selectedShop ? (
                <span className="text-[10px] bg-luxury-gold/20 text-luxury-gold px-2 py-0.5 rounded-full shrink-0 font-bold">
                  {selectedShop.brandName || selectedShop.shopName}
                </span>
              ) : (
                <FiMic className="text-luxury-gold text-sm shrink-0 opacity-80" />
              )}
            </div>
          </div>

        </div>
      </header>
      {/* ADVANCED AI-STYLE SEARCH SYSTEM MODAL */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Slide-out Sidebar Drawer Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  )
}

export default Header
