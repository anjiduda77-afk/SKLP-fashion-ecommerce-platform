import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiHeart, FiShoppingBag, FiTrash2 } from 'react-icons/fi'
import { wishlistService } from '@services/apiServices'
import { useCart } from '@context/CartContext'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'

function Wishlist() {
  const { isDarkMode } = useTheme()
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()

  const [wishlistItems, setWishlistItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWishlist = async () => {
    try {
      const res = await wishlistService.getWishlist()
      if (res.data && res.data.wishlist) {
        setWishlistItems(res.data.wishlist.items || [])
      }
    } catch (err) {
      console.warn('Failed to load wishlist from API, fallback to empty:', err.message)
      setWishlistItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await wishlistService.removeFromWishlist(productId)
      setWishlistItems(prev => prev.filter(item => item.product._id !== productId))
      toast.info('Removed from Wishlist.')
    } catch (err) {
      toast.error('Failed to remove item.')
    }
  }

  const handleMoveToCart = (item) => {
    const p = item.product
    if (!p) return
    addToCart({
      id: p._id,
      name: p.name,
      price: p.price - (p.price * (p.discount || 0) / 100),
      originalPrice: p.price,
      image: p.images?.[0]?.url || p.thumbnail,
      variant: { size: 'M' }
    })
    toast.success(`${p.name} added to cart!`)
  }

  if (!isAuthenticated) {
    return (
      <div className="container-custom py-24 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <div className="w-24 h-24 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center mb-6">
          <FiHeart size={40} />
        </div>
        <h1 className="text-4xl font-serif font-bold mb-4">Your Wishlist</h1>
        <p className="opacity-60 mb-8 max-w-sm">Sign in to save your favourite SKLP luxury pieces across devices.</p>
        <Link
          to="/login?redirect=/wishlist"
          className="px-8 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-colors"
        >
          LOG IN TO VIEW WISHLIST
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container-custom py-24 text-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-luxury-gold mx-auto mb-4" />
        <p className="opacity-60 text-sm">Fetching saved favorites...</p>
      </div>
    )
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="container-custom py-24 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <div className="w-24 h-24 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center mb-6">
          <FiHeart size={40} />
        </div>
        <h1 className="text-4xl font-serif font-bold mb-4">Your Wishlist is Empty</h1>
        <p className="opacity-60 mb-8 max-w-sm">Explore our signature haute couture collections and tap the heart icon on any piece to save it here.</p>
        <Link
          to="/products"
          className="px-8 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-colors"
        >
          DISCOVER COLLECTIONS
        </Link>
      </div>
    )
  }

  return (
    <div className="container-custom py-16 min-h-screen">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-wide uppercase mb-2">My Wishlist</h1>
          <p className="opacity-60 text-xs font-mono uppercase tracking-widest">{wishlistItems.length} Saved Luxury Pieces</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        <AnimatePresence>
          {wishlistItems.map((item) => {
            const p = item.product
            if (!p) return null
            const finalPrice = p.price - (p.price * (p.discount || 0) / 100)

            return (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`group relative rounded-2xl overflow-hidden border ${
                  isDarkMode ? 'bg-luxury-charcoal border-white/5' : 'bg-white border-gray-100'
                } shadow-lg flex flex-col justify-between`}
              >
                {/* Product Image */}
                <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
                  <img
                    src={p.images?.[0]?.url || p.thumbnail}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {p.discount > 0 && (
                    <span className="absolute top-4 left-4 bg-luxury-gold text-luxury-black font-bold text-[10px] uppercase px-3 py-1 tracking-widest">
                      -{p.discount}% OFF
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveFromWishlist(p._id)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:text-red-400 hover:bg-black/90 transition-colors"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-luxury-gold tracking-widest">{p.brand || 'SKLP Royale'}</span>
                    <h3 className="font-serif font-bold text-base line-clamp-1 group-hover:text-luxury-gold transition-colors">
                      <Link to={`/products/${p._id}`}>{p.name}</Link>
                    </h3>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                    <div>
                      <span className="text-lg font-bold font-mono text-luxury-gold">₹{finalPrice.toLocaleString()}</span>
                      {p.discount > 0 && (
                        <span className="text-xs font-mono line-through opacity-50 ml-2">₹{p.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleMoveToCart(item)}
                    className="w-full py-3 bg-luxury-gold text-luxury-black font-bold text-xs uppercase tracking-widest hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 rounded-lg"
                  >
                    <FiShoppingBag size={14} /> ADD TO CART
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Wishlist
