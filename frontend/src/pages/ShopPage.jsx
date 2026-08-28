import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTheme } from '@context/ThemeContext'
import { useCart } from '@context/CartContext'
import { 
  FiShoppingBag, FiStar, FiShield, FiTruck, 
  FiRotateCcw, FiCheckCircle, FiSearch
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { shopService } from '@services/apiServices'

function ShopPage() {
  const { slug } = useParams()
  const { isDarkMode } = useTheme()
  const { addToCart } = useCart()

  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('products')

  const fetchShopData = useCallback(async () => {
    try {
      setLoading(true)
      const [shopRes, productsRes] = await Promise.all([
        shopService.getShop(slug),
        shopService.getShopProducts(slug)
      ])

      if (shopRes.data?.success) setShop(shopRes.data.shop)
      if (productsRes.data?.success) setProducts(productsRes.data.products || [])
    } catch (err) {
      toast.error('Could not load shop information')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchShopData()
  }, [fetchShopData])

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Shop Not Found</h2>
        <p className={`text-sm ${textSecondary}`}>The merchant store you are looking for does not exist or is inactive.</p>
        <Link to="/products" className="inline-block px-6 py-2.5 bg-luxury-gold text-black font-bold text-xs rounded-xl">
          Browse All Products
        </Link>
      </div>
    )
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Shop Header Banner */}
      <div className={`rounded-3xl border overflow-hidden ${cardBg} shadow-2xl relative`}>
        {/* Banner gradient background */}
        <div className="h-44 md:h-56 bg-gradient-to-r from-luxury-black via-zinc-900 to-luxury-charcoal relative flex items-end p-6 md:p-8">
          <div className="absolute inset-0 bg-luxury-gold/5 opacity-40"></div>
        </div>

        {/* Profile Details Bar */}
        <div className="p-6 md:p-8 pt-0 flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12 relative z-10">
          <div className="flex items-end gap-5">
            {/* Logo */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-luxury-black border-4 border-luxury-gold/40 flex items-center justify-center text-luxury-gold font-serif font-bold text-4xl shadow-xl flex-shrink-0">
              {shop.logo?.url ? (
                <img src={shop.logo.url} alt={shop.shopName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                shop.shopName.charAt(0).toUpperCase()
              )}
            </div>

            {/* Shop Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-2xl md:text-3xl font-serif font-bold ${textPrimary}`}>
                  {shop.shopName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                  <FiCheckCircle size={12} /> Verified Seller
                </span>
              </div>
              <p className={`text-xs md:text-sm ${textSecondary} max-w-xl line-clamp-2`}>
                {shop.description || 'Premium curated fashion partner on SKLP Fashion Marketplace.'}
              </p>
            </div>
          </div>

          {/* Rating & Stats Badges */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-luxury-black/60 border-white/10' : 'bg-gray-50 border-gray-200'} text-center min-w-[90px]`}>
              <div className="flex items-center justify-center gap-1 text-luxury-gold font-bold text-base">
                <FiStar className="fill-luxury-gold" /> {shop.rating || '4.8'}
              </div>
              <span className={`text-[10px] ${textSecondary}`}>{shop.reviewCount || 45} Ratings</span>
            </div>

            <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-luxury-black/60 border-white/10' : 'bg-gray-50 border-gray-200'} text-center min-w-[90px]`}>
              <div className={`font-bold text-base ${textPrimary}`}>{products.length}</div>
              <span className={`text-[10px] ${textSecondary}`}>Active Products</span>
            </div>
          </div>
        </div>

        {/* Policy Badges Ribbon */}
        <div className={`border-t px-6 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs ${isDarkMode ? 'border-white/10 bg-luxury-black/40' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center gap-6 flex-wrap">
            <span className={`flex items-center gap-1.5 ${textSecondary}`}>
              <FiTruck className="text-luxury-gold" /> Fast Delivery: {shop.shippingPolicy?.defaultDeliveryDays || 3} Days
            </span>
            <span className={`flex items-center gap-1.5 ${textSecondary}`}>
              <FiRotateCcw className="text-luxury-gold" /> {shop.returnPolicy?.returnPeriodDays || 7}-Day Easy Returns
            </span>
            <span className={`flex items-center gap-1.5 ${textSecondary}`}>
              <FiShield className="text-luxury-gold" /> 100% Authentic Guaranteed
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'products'
                ? 'bg-luxury-gold text-black border-luxury-gold'
                : isDarkMode ? 'border-luxury-darkGray text-white hover:bg-white/5' : 'border-gray-300 text-gray-700'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'info'
                ? 'bg-luxury-gold text-black border-luxury-gold'
                : isDarkMode ? 'border-luxury-darkGray text-white hover:bg-white/5' : 'border-gray-300 text-gray-700'
            }`}
          >
            Store Information
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="relative w-full sm:w-72">
            <FiSearch className={`absolute left-3 top-3 text-xs ${textSecondary}`} />
            <input
              type="text"
              placeholder="Search in this shop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            />
          </div>
        )}
      </div>

      {/* Tab 1: Products Grid */}
      {activeTab === 'products' && (
        <div>
          {filteredProducts.length === 0 ? (
            <div className={`p-12 rounded-3xl border text-center ${cardBg} space-y-3`}>
              <FiShoppingBag size={36} className="mx-auto opacity-30 text-luxury-gold" />
              <h3 className={`text-base font-bold ${textPrimary}`}>No products found</h3>
              <p className={`text-xs ${textSecondary}`}>This store currently has no matching active listings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredProducts.map(product => (
                <div key={product.offerId || product.productId} className={`rounded-2xl border overflow-hidden ${cardBg} flex flex-col group hover:border-luxury-gold transition-all duration-300 shadow-md`}>
                  <Link to={`/products/${product.productId}`} className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                    <img
                      src={product.images?.[0]?.url || '/placeholder.png'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.discount > 0 && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                        {product.discount}% OFF
                      </span>
                    )}
                  </Link>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <p className="text-[10px] font-bold text-luxury-gold uppercase tracking-wider">{product.brand || 'SKLP'}</p>
                      <Link to={`/products/${product.productId}`} className={`text-xs font-bold ${textPrimary} hover:text-luxury-gold line-clamp-1`}>
                        {product.name}
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className={`text-sm font-bold ${textPrimary}`}>₹{product.price}</span>
                        {product.originalPrice > product.price && (
                          <span className={`text-xs line-through ml-1.5 ${textSecondary}`}>₹{product.originalPrice}</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          addToCart(product.productId, 1, {}, product.offerId)
                          toast.success(`Added "${product.name}" from ${shop.shopName}!`)
                        }}
                        className="px-3 py-1.5 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition-all"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Store Information */}
      {activeTab === 'info' && (
        <div className={`rounded-3xl border p-8 ${cardBg} space-y-6 max-w-3xl`}>
          <div>
            <h3 className={`text-lg font-bold ${textPrimary}`}>About {shop.shopName}</h3>
            <p className={`text-sm mt-2 leading-relaxed ${textSecondary}`}>
              {shop.description || 'Welcome to our verified storefront on SKLP Fashion. We offer authentic, high-quality fashion wear with reliable delivery across India.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-luxury-black/50 border-white/10' : 'bg-gray-50 border-gray-200'} space-y-1`}>
              <p className="text-xs font-bold text-luxury-gold flex items-center gap-1.5">
                <FiTruck /> Shipping Policy
              </p>
              <p className={`text-xs ${textSecondary}`}>
                Orders are processed within {shop.shippingPolicy?.processingTimeDays || 2} business days and delivered in {shop.shippingPolicy?.defaultDeliveryDays || 3} days.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-luxury-black/50 border-white/10' : 'bg-gray-50 border-gray-200'} space-y-1`}>
              <p className="text-xs font-bold text-luxury-gold flex items-center gap-1.5">
                <FiRotateCcw /> Return Policy
              </p>
              <p className={`text-xs ${textSecondary}`}>
                Hassle-free {shop.returnPolicy?.returnPeriodDays || 7}-day return policy on unworn items with original tags.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopPage
