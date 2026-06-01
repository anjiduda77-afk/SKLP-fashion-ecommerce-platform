import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTrash2, FiMinus, FiPlus, FiArrowRight, FiPercent, FiTruck, FiShoppingBag, FiCheck } from 'react-icons/fi'
import { useCart } from '@context/CartContext'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'

const AVAILABLE_COUPONS = [
  { code: 'SKLP20', desc: 'Flat 20% OFF on all premium garments', min: 1999, type: 'percent', val: 0.2 },
  { code: 'LUXURY50', desc: 'Save flat ₹5,000 on orders above ₹9,999', min: 9999, type: 'fixed', val: 5000 }
]

function Cart() {
  const { isDarkMode } = useTheme()
  const { cartItems, cartTotal, removeFromCart, updateCartItem, clearCart } = useCart()
  
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [showCouponsDrawer, setShowCouponsDrawer] = useState(false)

  // Progress Bar for Free Shipping
  const freeShippingThreshold = 1999
  const remainingForFreeShipping = freeShippingThreshold - cartTotal
  const progressPercent = Math.min((cartTotal / freeShippingThreshold) * 100, 100)

  const handleApplyCoupon = (code) => {
    const coupon = AVAILABLE_COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase())
    if (!coupon) {
      toast.error('Invalid coupon code.')
      return
    }
    if (cartTotal < coupon.min) {
      toast.error(`Minimum order value of ₹${coupon.min.toLocaleString()} required for this coupon.`)
      return
    }

    let calculatedDiscount = 0
    if (coupon.type === 'percent') {
      calculatedDiscount = cartTotal * coupon.val
    } else {
      calculatedDiscount = coupon.val
    }

    setAppliedCoupon(coupon)
    setDiscountAmount(calculatedDiscount)
    setCouponCode(coupon.code)
    toast.success(`Coupon ${coupon.code} applied! Discount: ₹${calculatedDiscount.toLocaleString()}`)
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setDiscountAmount(0)
    setCouponCode('')
    toast.info('Coupon removed.')
  }

  const finalTotal = Math.max(0, cartTotal - discountAmount)

  if (cartItems.length === 0) {
    return (
      <div className="container-custom py-24 text-center min-h-[70vh] flex flex-col justify-center items-center">
        <div className="w-24 h-24 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center mb-6">
          <FiShoppingBag size={40} />
        </div>
        <h1 className="text-4xl font-serif font-bold mb-4">Your Cart is Empty</h1>
        <p className="opacity-60 mb-8 max-w-sm">Explore our curated collections and experience the premium luxury fashion styling of SKLP.</p>
        <Link
          to="/products"
          className="px-8 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-colors"
        >
          START SHOPPING
        </Link>
      </div>
    )
  }

  return (
    <div className="container-custom py-16 min-h-screen">
      <h1 className="text-4xl font-serif font-bold mb-12 tracking-wide uppercase">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT COLUMN: Items List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Free Shipping Progress Indicator */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-black'}`}>
            <div className="flex items-center gap-3 mb-3">
              <FiTruck className="text-luxury-gold" size={20} />
              <span className="text-sm font-semibold">
                {remainingForFreeShipping > 0 ? (
                  <>Add <span className="text-luxury-gold font-bold">₹{remainingForFreeShipping.toLocaleString()}</span> more for <span className="text-luxury-gold font-bold">FREE EXPRESS SHIPPING</span></>
                ) : (
                  <span className="text-green-500 font-bold">CONGRATULATIONS! YOU QUALIFY FOR FREE INSURED SHIPPING</span>
                )}
              </span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6 }}
                className="bg-luxury-gold h-full rounded-full"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={`${item.id}-${JSON.stringify(item.variant)}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`flex gap-6 p-5 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5' : 'bg-white border-gray-100'} shadow-md`}
                >
                  {/* Thumbnail */}
                  <div className="w-24 md:w-32 aspect-[3/4] rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Info specs */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-serif font-bold text-base md:text-lg hover:text-luxury-gold transition-colors">
                            <Link to={`/products/${item.id}`}>{item.name}</Link>
                          </h3>
                          {item.variant && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.variant.size && (
                                <span className="text-[10px] px-2 py-0.5 border border-white/10 rounded font-mono uppercase">Size: {item.variant.size}</span>
                              )}
                              {item.variant.color && (
                                <span className="text-[10px] px-2 py-0.5 border border-white/10 rounded font-mono uppercase">Color: {item.variant.color}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.variant)}
                          className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/5 transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-luxury-gold/30 rounded-lg">
                        <button
                          onClick={() => updateCartItem(item.id, item.quantity - 1, item.variant)}
                          className="px-3 py-2 text-sm hover:text-luxury-gold"
                        >
                          <FiMinus size={10} />
                        </button>
                        <span className="px-3 text-xs font-bold font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItem(item.id, item.quantity + 1, item.variant)}
                          className="px-3 py-2 text-sm hover:text-luxury-gold"
                        >
                          <FiPlus size={10} />
                        </button>
                      </div>

                      {/* Pricing */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-luxury-gold">₹{(item.price * item.quantity).toLocaleString()}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs opacity-50 font-mono">₹{item.price.toLocaleString()} each</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Action links */}
          <div className="flex justify-between items-center pt-4">
            <Link to="/products" className="text-xs font-bold tracking-widest text-luxury-gold uppercase hover:underline">
              ← Continue Shopping
            </Link>
            <button
              onClick={clearCart}
              className="text-xs font-bold tracking-widest text-red-500 uppercase hover:underline"
            >
              Clear Shopping Cart
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Summary and Coupons */}
        <div className="space-y-6">
          {/* Coupon Application Block */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-gray-100 text-black'}`}>
            <h3 className="text-xs uppercase tracking-widest text-luxury-gold font-bold mb-4">Promo Coupon</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Code (e.g. SKLP20)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon}
                className="flex-1 bg-transparent border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-luxury-gold outline-none uppercase font-mono tracking-wider"
              />
              {appliedCoupon ? (
                <button
                  onClick={removeCoupon}
                  className="px-4 py-3 bg-red-500/20 text-red-500 font-bold text-xs uppercase rounded-lg hover:bg-red-500/30"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => handleApplyCoupon(couponCode)}
                  className="px-4 py-3 bg-luxury-gold text-luxury-black font-bold text-xs uppercase rounded-lg hover:bg-yellow-400"
                >
                  Apply
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowCouponsDrawer(true)}
              className="text-xs text-luxury-gold font-semibold hover:underline mt-4 flex items-center gap-1"
            >
              <FiPercent /> View Available Store Coupons
            </button>
          </div>

          {/* Order Summary details */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white border-gray-100 text-black'}`}>
            <h2 className="text-xl font-serif font-bold mb-6 tracking-wider">ORDER SUMMARY</h2>
            
            <div className="space-y-4 mb-6 pb-6 border-b border-white/10">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Subtotal</span>
                <span className="font-bold">₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Shipping</span>
                <span>{remainingForFreeShipping > 0 ? '₹150' : 'FREE'}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>- ₹{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="opacity-60">Estimated Taxes</span>
                <span>Included (0%)</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline mb-8">
              <span className="text-base font-bold">Grand Total</span>
              <span className="text-2xl font-bold text-luxury-gold">
                ₹{(finalTotal + (remainingForFreeShipping > 0 ? 150 : 0)).toLocaleString()}
              </span>
            </div>

            <Link
              to="/checkout"
              className="w-full py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-all text-center flex items-center justify-center gap-2"
            >
              PROCEED TO SECURE CHECKOUT <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>

      {/* ============ STORE COUPONS DRAWER ============ */}
      <AnimatePresence>
        {showCouponsDrawer && (
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
                  <h3 className="text-lg font-serif font-bold">STORE COUPONS</h3>
                  <button onClick={() => setShowCouponsDrawer(false)}>
                    <FiTrash2 size={24} className="text-luxury-gold rotate-45" />
                  </button>
                </div>

                <div className="space-y-4">
                  {AVAILABLE_COUPONS.map(c => {
                    const isApplicable = cartTotal >= c.min
                    return (
                      <div
                        key={c.code}
                        className={`p-4 border rounded-xl flex flex-col justify-between ${
                          isApplicable ? 'border-luxury-gold/50 bg-luxury-gold/5' : 'border-white/10 opacity-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-mono font-bold text-lg text-luxury-gold">{c.code}</span>
                          {isApplicable ? (
                            <button
                              onClick={() => { handleApplyCoupon(c.code); setShowCouponsDrawer(false) }}
                              className="px-3 py-1 bg-luxury-gold text-luxury-black font-bold text-xs uppercase hover:bg-yellow-400"
                            >
                              Apply
                            </button>
                          ) : (
                            <span className="text-[10px] uppercase font-mono tracking-wider opacity-60">Min ₹{c.min.toLocaleString()}</span>
                          )}
                        </div>
                        <p className="text-xs opacity-75">{c.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Cart
