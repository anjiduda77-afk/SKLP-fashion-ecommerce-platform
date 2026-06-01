import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiShoppingBag, FiHeart, FiStar, FiChevronRight, FiPlus, FiMinus, FiTruck, FiActivity, FiX, FiCheck } from 'react-icons/fi'
import { productService } from '@services/apiServices'
import { useCart } from '@context/CartContext'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'

function ProductDetail() {
  const { id } = useParams()
  const { isDarkMode } = useTheme()
  const { addToCart } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  
  // Selection States
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Zoom Magnifier States
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' })

  // Drawer / Modals
  const [showSizeAdvisor, setShowSizeAdvisor] = useState(false)
  const [showOutfitDrawer, setShowOutfitDrawer] = useState(false)
  
  // Size Advisor Input
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [fitPreference, setFitPreference] = useState('regular')
  const [advisedSize, setAdvisedSize] = useState('')

  // Accordion Section
  const [activeTab, setActiveTab] = useState('description')

  // Load product data
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const res = await productService.getProduct(id)
        if (res.data && res.data.product) {
          setProduct(res.data.product)
          // Pre-select first variant options
          if (res.data.product.sizes?.length > 0) setSelectedSize(res.data.product.sizes[0])
          if (res.data.product.colors?.length > 0) setSelectedColor(res.data.product.colors[0])
        }
      } catch (err) {
        console.warn('Backend API getProduct failed, using luxury mock details:', err.message)
        // Luxury Mock DB
        const mockDb = {
          _id: id,
          name: id === 'f1' ? 'Premium Velvet Blazer' : id === 'f2' ? 'Royal Heritage Banarasi Silk Saree' : 'Italian Leather Oxford Shoes',
          brand: 'SKLP Royale',
          price: id === 'f1' ? 8999 : id === 'f2' ? 14999 : 9999,
          originalPrice: id === 'f1' ? 12999 : id === 'f2' ? 24900 : 15999,
          discount: id === 'f1' ? 30 : id === 'f2' ? 40 : 37,
          description: 'A masterpiece of elegance. Structured shoulders, double-breasted closure, and a gold velvet trim. Experience haute couture at its peak.',
          images: [
            { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80' },
            { url: 'https://images.unsplash.com/photo-1598808503744-f34c53bdb9eb?auto=format&fit=crop&w=800&q=80' },
            { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80' }
          ],
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Gold Black', 'Midnight Blue', 'Emerald Green'],
          countInStock: 25,
          rating: 5,
          category: 'fashion-wear',
          gender: 'men'
        }
        setProduct(mockDb)
        setSelectedSize(mockDb.sizes[0])
        setSelectedColor(mockDb.colors[0])
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  // Magnifier Hover logic
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect()
    const x = ((e.pageX - left - window.scrollX) / width) * 100
    const y = ((e.pageY - top - window.scrollY) / height) * 100
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${product?.images?.[activeImageIdx]?.url || product?.image})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '200%'
    })
  }

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' })
  }

  // Size Advisor logic
  const calculateAdvisedSize = () => {
    const h = Number(height)
    const w = Number(weight)
    if (!h || !w) return
    let base = 'M'
    if (h > 180 || w > 80) base = 'XL'
    else if (h > 170 || w > 70) base = 'L'
    else if (h < 160 || w < 55) base = 'S'
    
    if (fitPreference === 'slim' && base !== 'S') {
      base = base === 'XL' ? 'L' : base === 'L' ? 'M' : 'S'
    } else if (fitPreference === 'oversized' && base !== 'XL') {
      base = base === 'S' ? 'M' : base === 'M' ? 'L' : 'XL'
    }
    setAdvisedSize(base)
  }

  // Quick purchase Outfit items
  const outfitLook = {
    title: 'Royal Emperor Lookbook',
    items: [
      { id: 'f1', name: 'Premium Velvet Blazer', price: 8999, image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&q=80' },
      { id: 'f3', name: 'Italian Leather Oxford Shoes', price: 9999, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=200&q=80' }
    ]
  }

  const addEntireOutfit = () => {
    outfitLook.items.forEach(item => {
      addToCart({
        _id: item.id,
        name: item.name,
        price: item.price,
        images: [{ url: item.image }]
      }, 1, { size: 'M', color: 'Gold' })
    })
    toast.success('Complete look added to Cart!')
    setShowOutfitDrawer(false)
  }

  if (loading) {
    return (
      <div className="container-custom py-24 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-luxury-gold mx-auto mb-6" />
        <p className="font-serif tracking-widest text-luxury-gold uppercase">Tailoring details...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container-custom py-24 text-center">
        <p className="text-xl mb-4">Premium product not found.</p>
        <Link to="/products" className="btn btn-primary">Back to Shop</Link>
      </div>
    )
  }

  const activeImg = product.images?.[activeImageIdx]?.url || product.image

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav className="text-xs uppercase tracking-widest opacity-60 mb-8 flex items-center gap-2">
          <Link to="/">Home</Link> <FiChevronRight />
          <Link to="/products">Shop</Link> <FiChevronRight />
          <span className="text-luxury-gold">{product.name}</span>
        </nav>

        {/* ============ MAIN DETAIL SECTION ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* LEFT: Cinematic Gallery with Magnifier */}
          <div className="space-y-4">
            <div
              className={`relative overflow-hidden rounded-3xl aspect-[4/5] cursor-zoom-in ${isDarkMode ? 'bg-luxury-charcoal' : 'bg-gray-100'}`}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <img
                src={activeImg}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {/* Zoom Preview Panel */}
              <div
                style={zoomStyle}
                className="absolute inset-0 bg-no-repeat pointer-events-none transition-all duration-75 border-2 border-luxury-gold/30 rounded-3xl"
              />
            </div>
            
            {/* Thumbnail Selectors */}
            {product.images?.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      idx === activeImageIdx ? 'border-luxury-gold scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Specs / Interactive Selections */}
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-luxury-gold font-semibold mb-2">{product.brand || 'SKLP Couture'}</p>
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">{product.name}</h1>
              
              {/* Review & Ratings */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex text-luxury-gold">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} size={14} className={i < (product.rating || 5) ? 'fill-luxury-gold' : 'text-gray-400'} />
                  ))}
                </div>
                <span className="text-xs opacity-60">(4.9/5 based on 218 Couture reviews)</span>
              </div>

              {/* Price Details */}
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-4xl font-bold text-luxury-gold">₹{product.price.toLocaleString()}</span>
                {product.originalPrice && (
                  <span className="text-lg line-through opacity-40">₹{product.originalPrice.toLocaleString()}</span>
                )}
                {product.discount > 0 && (
                  <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">
                    Save {product.discount}%
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="opacity-70 mb-8 leading-relaxed text-sm md:text-base">
                {product.description}
              </p>

              {/* Color Select */}
              {product.colors?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-wider text-luxury-gold font-bold mb-3">Color: <span className="text-white opacity-80">{selectedColor}</span></h3>
                  <div className="flex gap-3">
                    {product.colors.map(col => (
                      <button
                        key={col}
                        onClick={() => setSelectedColor(col)}
                        className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wider transition-all ${
                          selectedColor === col ? 'bg-luxury-gold text-luxury-black border-luxury-gold font-bold' : 'border-white/10 hover:border-white/40'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Select with Recommender Link */}
              {product.sizes?.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs uppercase tracking-wider text-luxury-gold font-bold">Select Size</h3>
                    <button
                      onClick={() => setShowSizeAdvisor(true)}
                      className="text-xs text-luxury-gold hover:underline flex items-center gap-1 font-semibold"
                    >
                      <FiActivity /> Size Recommendation Advisor
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(sz => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`w-12 h-12 border text-xs font-bold uppercase flex items-center justify-center transition-all ${
                          selectedSize === sz ? 'bg-luxury-gold text-luxury-black border-luxury-gold' : 'border-white/10 hover:border-white/40'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Select */}
              <div className="mb-8 flex items-center gap-4">
                <span className="text-xs uppercase tracking-wider text-luxury-gold font-bold">Quantity:</span>
                <div className="flex items-center border border-luxury-gold/30 rounded-lg">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-2 hover:text-luxury-gold">
                    <FiMinus size={12} />
                  </button>
                  <span className="px-4 text-sm font-bold font-mono">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="px-4 py-2 hover:text-luxury-gold">
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex gap-4">
                <button
                  onClick={() => { addToCart(product, quantity, { size: selectedSize, color: selectedColor }); toast.success('Added to Cart!') }}
                  className="flex-1 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                >
                  <FiShoppingBag /> Add to Shopping Cart
                </button>
                <button className={`p-4 border rounded-xl ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <FiHeart className="text-luxury-gold fill-luxury-gold" size={20} />
                </button>
              </div>

              {/* Outfit Recommendation look Trigger */}
              <button
                onClick={() => setShowOutfitDrawer(true)}
                className="w-full py-4 border border-luxury-gold text-luxury-gold font-bold tracking-wider text-xs uppercase hover:bg-luxury-gold hover:text-luxury-black transition-all"
              >
                View Curated Styling Outfit Look
              </button>
            </div>
          </div>
        </div>

        {/* ============ TAB DETAILS (Description, Shipping, Returns) ============ */}
        <section className="mb-20">
          <div className="flex border-b border-white/10 mb-8">
            {['description', 'specifications', 'shipping'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 text-sm uppercase tracking-widest font-bold border-b-2 transition-all ${
                  activeTab === tab ? 'border-luxury-gold text-luxury-gold' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed opacity-70">
            {activeTab === 'description' && (
              <p>This premium collection is crafted with natural organic yarns, ensuring comfortable breathability for hot summers and insulating warmth in cooler seasons. Detailed couture elements are handfinished, presenting luxurious tailoring suitable for formal collections and premium events.</p>
            )}
            {activeTab === 'specifications' && (
              <ul className="list-disc pl-5 space-y-2">
                <li>Material composition: 85% Organic Cotton, 15% Mulberry Silk</li>
                <li>Fit style: Slim structured tailored shoulders</li>
                <li>Design details: Contrast golden piping buttons and lapels</li>
                <li>Care Instructions: Dry clean only</li>
              </ul>
            )}
            {activeTab === 'shipping' && (
              <div className="flex gap-4 items-center">
                <FiTruck size={24} className="text-luxury-gold" />
                <p>Enjoy free insured shipping across India. Guaranteed delivery within 3-5 business days. Return requested within 7 days is valid for a full refund.</p>
              </div>
            )}
          </div>
        </section>

        {/* ============ RELATED PRODUCTS ============ */}
        <section>
          <h2 className="text-3xl font-serif font-bold mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { id: 'f2', name: 'Royal Heritage Banarasi Saree', price: 14999, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80' },
              { id: 'f3', name: 'Italian Leather Oxford Shoes', price: 9999, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=400&q=80' }
            ].map(item => (
              <Link key={item.id} to={`/products/${item.id}`} className="group block">
                <div className={`overflow-hidden rounded-2xl ${isDarkMode ? 'bg-luxury-charcoal' : 'bg-white'} p-3 border border-white/5`}>
                  <div className="aspect-[3/4] overflow-hidden rounded-xl mb-4">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-luxury-gold transition-colors">{item.name}</h3>
                  <p className="text-luxury-gold font-bold mt-1 text-sm">₹{item.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ============ SIZE RECOMMENDATION ADVISOR MODAL ============ */}
      <AnimatePresence>
        {showSizeAdvisor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-md p-6 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-gold/20 text-white' : 'bg-white text-black'}`}
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-6">
                <h3 className="text-lg font-serif font-bold">AI Size Recommendation</h3>
                <button onClick={() => setShowSizeAdvisor(false)}>
                  <FiX size={24} className="text-luxury-gold" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-luxury-gold block mb-1">Your Height (cm)</label>
                  <input
                    type="number"
                    placeholder="e.g. 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 outline-none focus:border-luxury-gold text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-luxury-gold block mb-1">Your Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 outline-none focus:border-luxury-gold text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-luxury-gold block mb-1">Fit Preference</label>
                  <select
                    value={fitPreference}
                    onChange={(e) => setFitPreference(e.target.value)}
                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 outline-none focus:border-luxury-gold text-sm"
                  >
                    <option value="slim">Slim Tailored Fit</option>
                    <option value="regular">Regular Fit</option>
                    <option value="oversized">Comfort Oversized Fit</option>
                  </select>
                </div>
                
                <button
                  onClick={calculateAdvisedSize}
                  className="w-full py-3 bg-luxury-gold text-luxury-black font-bold uppercase tracking-wider text-xs hover:bg-yellow-400 transition-colors"
                >
                  Calculate Perfect Size
                </button>

                {advisedSize && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-luxury-gold/10 border border-luxury-gold rounded-xl text-center"
                  >
                    <p className="text-xs uppercase tracking-widest text-luxury-gold mb-1">Advised Size</p>
                    <p className="text-3xl font-bold text-luxury-gold">{advisedSize}</p>
                    <button
                      onClick={() => { setSelectedSize(advisedSize); setShowSizeAdvisor(false); toast.success(`Selected Size: ${advisedSize}`) }}
                      className="text-xs text-white underline mt-2 font-semibold hover:text-luxury-gold block mx-auto"
                    >
                      Apply Recommended Size
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ AI OUTFIT STYLE LOOK DRAWER ============ */}
      <AnimatePresence>
        {showOutfitDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
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
                  <div>
                    <h3 className="text-lg font-serif font-bold uppercase tracking-wider">{outfitLook.title}</h3>
                    <p className="text-xs opacity-60">AI Stylist Curated Complete Styling Outfit</p>
                  </div>
                  <button onClick={() => setShowOutfitDrawer(false)}>
                    <FiX size={24} className="text-luxury-gold" />
                  </button>
                </div>

                <div className="space-y-6">
                  {outfitLook.items.map(item => (
                    <div key={item.id} className="flex gap-4 items-center bg-luxury-charcoal/50 p-3 border border-white/5 rounded-xl">
                      <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                        <p className="text-luxury-gold font-bold text-xs mt-1">₹{item.price.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-green-500/10 text-green-500 rounded-full">
                        <FiCheck size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm opacity-60">Complete Look Value:</span>
                  <span className="text-2xl font-bold text-luxury-gold">₹18,998</span>
                </div>
                <button
                  onClick={addEntireOutfit}
                  className="w-full py-4 bg-luxury-gold text-luxury-black font-bold uppercase tracking-wider text-xs hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                >
                  <FiShoppingBag /> Add Entire Outfit Look (2 Items)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProductDetail
