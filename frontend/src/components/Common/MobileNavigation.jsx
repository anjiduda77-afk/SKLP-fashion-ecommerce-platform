import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiShoppingCart, FiHeart, FiShoppingBag, FiBell, FiUser } from 'react-icons/fi'
import { useCart } from '@context/CartContext'
import { useWishlist } from '@context/WishlistContext'
import { useAuth } from '@context/AuthContext'

function MobileNavigation({ isDarkMode }) {
  const { itemCount } = useCart()
  const { wishlistCount } = useWishlist()
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  
  const [visible, setVisible] = useState(true)
  const [notificationCount] = useState(2) // Simulated luxury alert count
  const [lastScroll, setLastScroll] = useState(0)

  // Detect scroll direction to auto-hide or show bottom navigation bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      // Threshold check to avoid jitter
      if (currentScroll > lastScroll + 40 && currentScroll > 100) {
        setVisible(false) // Scrolling down - Hide
      } else if (currentScroll < lastScroll - 30) {
        setVisible(true)  // Scrolling up - Show
      }
      setLastScroll(currentScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScroll])

  const navItems = [
    {
      label: 'Cart',
      path: '/cart',
      icon: <FiShoppingCart size={22} />,
      badge: itemCount,
      color: 'text-luxury-gold'
    },
    {
      label: 'Wishlist',
      path: '/wishlist',
      icon: <FiHeart size={22} />,
      badge: wishlistCount,
      color: 'text-red-500'
    },
    {
      label: 'Orders',
      path: '/orders',
      icon: <FiShoppingBag size={22} />,
      badge: 0,
      color: 'text-luxury-gold'
    },
    {
      label: 'Alerts',
      path: '/orders', // In ecommers usually orders alerts trigger notifications
      icon: <FiBell size={22} />,
      badge: notificationCount,
      color: 'text-luxury-gold'
    },
    {
      label: 'Profile',
      path: isAuthenticated ? '/profile' : '/login',
      icon: <FiUser size={22} />,
      badge: 0,
      color: 'text-luxury-gold'
    }
  ]

  return (
    <nav 
      className={`fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 rounded-[2rem] border transition-all duration-300 md:hidden
        ${isDarkMode 
          ? 'bg-luxury-black/85 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.6)]' 
          : 'bg-white/85 border-luxury-gold/25 shadow-[0_10px_30px_rgba(0,0,0,0.08)]'
        } 
        ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-24 scale-95 opacity-0'}`}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          
          return (
            <Link 
              key={item.label} 
              to={item.path} 
              className="relative flex flex-col items-center gap-1 group py-1"
            >
              {/* Touch Animated Icon container */}
              <motion.div 
                whileTap={{ scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className={`relative p-1 transition-all duration-200
                  ${isActive 
                    ? isDarkMode ? 'text-luxury-gold scale-110' : 'text-luxury-darkGold scale-110'
                    : isDarkMode ? 'text-white/60 hover:text-white' : 'text-luxury-darkBlack/60 hover:text-luxury-darkBlack'
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
                      className={`absolute -top-1.5 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-extrabold text-white shadow-md
                        ${item.label === 'Wishlist' ? 'bg-red-500' : 'bg-luxury-gold text-black shadow-glow'}`}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Sub-label text */}
              <span 
                className={`text-[9px] uppercase tracking-widest font-semibold transition-colors duration-200
                  ${isActive 
                    ? isDarkMode ? 'text-luxury-gold' : 'text-luxury-darkGold'
                    : isDarkMode ? 'text-white/40' : 'text-luxury-darkBlack/45'
                  }`}
              >
                {item.label}
              </span>

              {/* Bottom active dot indicator */}
              {isActive && (
                <motion.span 
                  layoutId="activeDot"
                  className="absolute bottom-0 w-1 h-1 rounded-full bg-luxury-gold" 
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNavigation
