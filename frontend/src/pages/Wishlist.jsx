import { Link } from 'react-router-dom'
import { useWishlist } from '@context/WishlistContext'
import { useCart } from '@context/CartContext'
import { FiHeart, FiShoppingCart, FiTrash2, FiStar, FiArrowRight } from 'react-icons/fi'
import { toast } from 'react-toastify'

function WishlistCard({ item, onRemove, onAddToCart }) {
  return (
    <div className="card group overflow-hidden p-0 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden h-52 bg-luxury-darkGray">
        <img
          src={item.images?.[0]?.url || item.thumbnail || item.image || 'https://via.placeholder.com/300x200?text=SKLP'}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Discount Badge */}
        {item.discount > 0 && (
          <span className="absolute top-3 left-3 bg-luxury-gold text-luxury-black text-xs font-bold px-2 py-1 rounded-full">
            -{item.discount}%
          </span>
        )}
        {/* Remove Button */}
        <button
          onClick={() => onRemove(item._id || item.id)}
          className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          <FiTrash2 size={14} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-luxury-mediumGray uppercase tracking-widest mb-1">{item.category || 'Fashion'}</p>
        <Link to={`/products/${item._id || item.id}`} className="font-semibold hover:text-luxury-gold transition-colors line-clamp-2 mb-2">
          {item.name}
        </Link>

        {/* Rating */}
        {item.rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <FiStar size={13} className="text-luxury-gold fill-luxury-gold" />
            <span className="text-sm font-semibold">{item.rating?.toFixed(1)}</span>
            <span className="text-xs text-luxury-mediumGray">({item.reviewCount || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto mb-3">
          <span className="text-luxury-gold font-bold text-lg">
            ₹{(item.discountedPrice || item.price)?.toLocaleString('en-IN')}
          </span>
          {item.price && item.discountedPrice && item.price !== item.discountedPrice && (
            <span className="text-luxury-mediumGray line-through text-sm">
              ₹{item.price?.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={() => onAddToCart(item)}
          className="w-full py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all duration-200 hover:shadow-glow flex items-center justify-center gap-2 text-sm"
        >
          <FiShoppingCart size={15} />
          Add to Cart
        </button>
      </div>
    </div>
  )
}

function Wishlist() {
  const { wishlistItems, removeFromWishlist, clearWishlist } = useWishlist()
  const { addToCart } = useCart()

  const handleAddToCart = (item) => {
    addToCart(item)
    toast.success(`${item.name} added to cart!`)
  }

  const handleMoveAllToCart = () => {
    wishlistItems.forEach((item) => addToCart(item))
    clearWishlist()
    toast.success(`${wishlistItems.length} items moved to cart!`)
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="container-custom py-20 min-h-screen">
        <h1 className="text-4xl font-serif font-bold mb-4">My Wishlist</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 rounded-full bg-luxury-charcoal border-2 border-luxury-mediumGray/20 flex items-center justify-center mb-6">
            <FiHeart size={36} className="text-luxury-mediumGray" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-3">Your wishlist is empty</h2>
          <p className="text-luxury-mediumGray mb-8 max-w-sm">
            Save your favourite items here and shop them whenever you're ready.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-3 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all hover:shadow-glow"
          >
            Explore Products <FiArrowRight />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-12 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold">My Wishlist</h1>
          <p className="text-luxury-mediumGray mt-1">{wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} saved</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleMoveAllToCart}
            className="flex items-center gap-2 px-5 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all hover:shadow-glow text-sm"
          >
            <FiShoppingCart size={16} />
            Move All to Cart
          </button>
          <button
            onClick={clearWishlist}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-500/40 text-red-400 font-semibold rounded-xl hover:bg-red-900/20 transition-all text-sm"
          >
            <FiTrash2 size={15} />
            Clear All
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlistItems.map((item) => (
          <WishlistCard
            key={item._id || item.id}
            item={item}
            onRemove={removeFromWishlist}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {/* Continue Shopping */}
      <div className="text-center mt-12">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-luxury-gold hover:underline font-semibold"
        >
          Continue Shopping <FiArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

export default Wishlist
