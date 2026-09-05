import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FiHome, FiShoppingCart, FiHeart, FiUser } from 'react-icons/fi'
import { RiStore2Line } from 'react-icons/ri'
import { useCart } from '@context/CartContext'
import { useWishlist } from '@context/WishlistContext'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { useShop } from '@context/ShopContext'

function MobileNavigation() {
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { itemCount } = useCart()
  const { wishlistCount } = useWishlist()
  const { isAuthenticated } = useAuth()
  const { selectedShop, openShopModal } = useShop()
  const location = useLocation()
  
  const [visible, setVisible] = useState(true)
  const [lastScroll, setLastScroll] = useState(0)

  // Detect scroll direction to auto-hide or show bottom navigation bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      // Threshold check to avoid jitter
      if (currentScroll > lastScroll + 45 && currentScroll > 120) {
        setVisible(false) // Scrolling down - Hide
      } else if (currentScroll < lastScroll - 25) {
        setVisible(true)  // Scrolling up - Show
      }
      setLastScroll(currentScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScroll])

  const navItems = [
    {
      label: t('nav.home', 'Home'),
      path: '/',
      icon: <FiHome size={20} />,
      badge: 0,
      isAction: false
    },
    {
      label: selectedShop ? (selectedShop.brandName || selectedShop.shopName) : t('nav.shop', 'Brands'),
      path: '/shops',
      icon: <RiStore2Line size={20} />,
      badge: 0,
      isAction: true,
      action: openShopModal
    },
    {
      label: t('common.wishlist', 'Wishlist'),
      path: '/wishlist',
      icon: <FiHeart size={20} />,
      badge: wishlistCount,
      isAction: false
    },
    {
      label: t('common.cart', 'Cart'),
      path: '/cart',
      icon: <FiShoppingCart size={20} />,
      badge: itemCount,
      isAction: false
    },
    {
      label: t('common.profile', 'Account'),
      path: isAuthenticated ? '/profile' : '/login',
      icon: <FiUser size={20} />,
      badge: 0,
      isAction: false
    }
  ]

  return (
    <nav 
      aria-label="Mobile Navigation"
      className={`fixed bottom-2 xs:bottom-3 left-1/2 z-40 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 rounded-[2rem] border transition-all duration-300 md:hidden backdrop-blur-2xl
        ${isDarkMode 
          ? 'bg-luxury-black/90 border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.7)] text-white' 
          : 'bg-white/92 border-luxury-gold/30 shadow-[0_12px_36px_rgba(218,165,32,0.15)] text-luxury-darkBlack'
        } 
        ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-24 scale-95 opacity-0 pointer-events-none'}`}
      style={{ paddingBottom: 'calc(0.4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = !item.isAction && location.pathname === item.path
          
          const content = (
            <div className="relative flex flex-col items-center justify-center gap-0.5 py-1 min-w-[54px] min-h-[44px] touch-target">
              {/* Touch Animated Icon container */}
              <motion.div 
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                className={`relative p-1 transition-colors duration-200
                  ${isActive 
                    ? isDarkMode ? 'text-luxury-gold' : 'text-luxury-darkGold'
                    : isDarkMode ? 'text-white/60 group-hover:text-white' : 'text-luxury-darkBlack/65 group-hover:text-luxury-darkBlack'
                  }`}
              >
                {item.icon}

                {/* Live Count Badge */}
                <AnimatePresence>
                  {item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={`absolute -top-1 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black text-white shadow-md
                        ${item.label === 'Wishlist' ? 'bg-red-500' : 'bg-luxury-gold text-black shadow-glow'}`}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Sub-label text */}
              <span 
                className={`text-[9px] uppercase tracking-wider font-bold transition-colors duration-200 max-w-[62px] truncate
                  ${isActive 
                    ? isDarkMode ? 'text-luxury-gold' : 'text-luxury-darkGold'
                    : isDarkMode ? 'text-white/50' : 'text-luxury-darkBlack/55'
                  }`}
              >
                {item.label}
              </span>

              {/* Bottom active dot indicator */}
              {isActive && (
                <motion.span 
                  layoutId="activeBottomDot"
                  className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-luxury-gold shadow-glow" 
                />
              )}
            </div>
          )

          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="group relative cursor-pointer"
                aria-label={item.label}
              >
                {content}
              </button>
            )
          }

          return (
            <Link 
              key={item.label} 
              to={item.path} 
              className="group relative"
              aria-label={item.label}
            >
              {content}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNavigation
