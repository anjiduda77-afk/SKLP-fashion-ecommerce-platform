import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  FiTrash2,
  FiMinus,
  FiPlus,
  FiArrowRight,
  FiPercent,
  FiTruck,
  FiShoppingBag,
  FiHeart,
  FiShare2,
  FiEye,
  FiZap,
  FiCheckCircle,
  FiX
} from 'react-icons/fi'
import { useCart } from '@context/CartContext'
import { useWishlist } from '@context/WishlistContext'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { cartService, deliveryFeeService, userService } from '@services/apiServices'
import { toast } from 'react-toastify'

function Cart() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isDarkMode } = useTheme()
  const { isAuthenticated } = useAuth()
  const { cartItems, cartTotal, removeFromCart, updateCartItem, moveToWishlist, clearCart } = useCart()
  const { addToWishlist } = useWishlist()

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  
  // Available coupons from database
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [showCouponsDrawer, setShowCouponsDrawer] = useState(false)

  // Real delivery fee state
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [isFreeDelivery, setIsFreeDelivery] = useState(false)
  const [deliveryLabel, setDeliveryLabel] = useState('')
  const [calculatingDelivery, setCalculatingDelivery] = useState(false)

  // ── 1. Fetch Real Delivery Fee from Backend ────────────────────────────────
  const calculateRealDeliveryFee = useCallback(async () => {
    if (cartItems.length === 0) {
      setDeliveryFee(0)
      setIsFreeDelivery(false)
      return
    }

    setCalculatingDelivery(true)
    try {
      // Check if all items in cart are from Free Delivery sellers
      const allSellersFree = cartItems.every(
        (item) => item.seller?.deliveryMode === 'FREE_DELIVERY'
      )

      if (allSellersFree && cartItems.length > 0) {
        setDeliveryFee(0)
        setIsFreeDelivery(true)
        setDeliveryLabel('Free delivery by merchant 🎉')
        setCalculatingDelivery(false)
        return
      }

      // If user is authenticated, check saved default address
      let userAddr = null
      if (isAuthenticated) {
        try {
          const addrRes = await userService.getAddresses()
          if (addrRes.data?.addresses?.length > 0) {
            userAddr = addrRes.data.addresses.find((a) => a.isDefault) || addrRes.data.addresses[0]
          }
        } catch (_addrErr) {
          // ignore address error
        }
      }

      const shippingTarget = userAddr
        ? {
            street: userAddr.street,
            city: userAddr.city,
            state: userAddr.state,
            postalCode: userAddr.postalCode || userAddr.pincode,
            country: userAddr.country || 'India'
          }
        : {
            city: 'Hyderabad',
            postalCode: '500001',
            country: 'India'
          }

      const payload = {
        ...shippingTarget,
        subtotal: cartTotal,
        items: cartItems.map((it) => ({
          productId: it.productId || it.id,
          sellerId: it.sellerId,
          price: it.price,
          quantity: it.quantity
        }))
      }

      const res = await deliveryFeeService.calculate(payload)
      if (res.data?.success) {
        const fee = Number(res.data.deliveryFee) || 0
        setDeliveryFee(fee)
        setIsFreeDelivery(fee === 0)
        setDeliveryLabel(res.data.deliveryLabel || (fee === 0 ? 'Free delivery 🎉' : `₹${fee}`))
      }
    } catch (err) {
      // Fallback: 0-6km slab fee is ₹10
      setDeliveryFee(10)
      setIsFreeDelivery(false)
      setDeliveryLabel('Delivery charge from ₹10')
    } finally {
      setCalculatingDelivery(false)
    }
  }, [cartItems, cartTotal, isAuthenticated])

  useEffect(() => {
    calculateRealDeliveryFee()
  }, [calculateRealDeliveryFee])

  // ── 2. Fetch Available Coupons from Database (Zero Hardcoding) ───────────────
  const fetchAvailableCoupons = useCallback(async () => {
    setLoadingCoupons(true)
    try {
      const res = await cartService.getAvailableCoupons()
      if (res.data?.success) {
        setAvailableCoupons(res.data.coupons || [])
      }
    } catch (err) {
      console.warn('Could not fetch active coupons:', err.message)
    } finally {
      setLoadingCoupons(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailableCoupons()
  }, [fetchAvailableCoupons])

  // ── 3. Apply / Remove Coupon via Backend ───────────────────────────────────
  const handleApplyCoupon = async (codeToApply) => {
    const clean = (codeToApply || couponCode).trim().toUpperCase()
    if (!clean) {
      toast.error('Please enter a coupon code')
      return
    }

    setApplyingCoupon(true)
    try {
      const res = await cartService.applyCoupon(clean)
      if (res.data?.success) {
        const discount = res.data.discountAmount || 0
        setAppliedCoupon({
          code: clean,
          ...res.data.coupon
        })
        setDiscountAmount(discount)
        setCouponCode(clean)
        toast.success(res.data.message || `Coupon ${clean} applied! Discount: ₹${discount.toLocaleString()}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired coupon code')
    } finally {
      setApplyingCoupon(false)
    }
  }

  const handleRemoveCoupon = async () => {
    try {
      await cartService.removeCoupon()
    } catch (_e) {
      // safe fallback
    }
    setAppliedCoupon(null)
    setDiscountAmount(0)
    setCouponCode('')
    toast.info('Coupon removed.')
  }

  // ── 4. Move to Wishlist ────────────────────────────────────────────────────
  const handleMoveToWishlist = async (item) => {
    const itemId = item._id || item.id
    try {
      await moveToWishlist(itemId)
      addToWishlist({
        _id: item.productId || item.id,
        id: item.productId || item.id,
        name: item.name,
        price: item.price,
        image: item.image
      })
      toast.success(`"${item.name}" moved to wishlist ❤️`)
    } catch (err) {
      toast.error('Could not move item to wishlist')
    }
  }

  // ── 5. Share Action ────────────────────────────────────────────────────────
  const handleShare = async (item) => {
    const prodId = item.productId || item.id
    const shareUrl = `${window.location.origin}/products/${prodId}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `Check out ${item.name} on Style Street Fashion:`,
          url: shareUrl
        })
      } catch (_e) {
        /* share was dismissed or cancelled by user */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Product link copied to clipboard! ↗')
      } catch (clipErr) {
        toast.info(shareUrl)
      }
    }
  }

  // ── 6. Buy Now Action (Single Item Checkout Isolation) ────────────────────
  const handleBuyNow = (item) => {
    navigate('/checkout', {
      state: {
        isBuyNow: true,
        buyNowItem: {
          productId: item.productId || item.id,
          name: item.name,
          price: item.price,
          originalPrice: item.originalPrice,
          image: item.image,
          quantity: item.quantity,
          variant: item.variant,
          brand: item.brand,
          sellerId: item.sellerId,
          shopName: item.shopName,
          cartItemId: item._id
        }
      }
    })
  }

  // Final calculated total
  const finalGrandTotal = Math.max(0, parseFloat((cartTotal - discountAmount + deliveryFee).toFixed(2)))

  // ── Empty Cart View ────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <div className="container-custom py-24 text-center min-h-[70vh] flex flex-col justify-center items-center">
        <div className="w-24 h-24 rounded-full bg-luxury-gold/10 text-luxury-gold flex items-center justify-center mb-6">
          <FiShoppingBag size={42} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3 tracking-wide uppercase">
          Shopping Cart
        </h1>
        <p className="opacity-60 mb-8 max-w-sm text-sm">
          Your cart is empty. Review your saved items or explore our latest luxury fashion drops.
        </p>
        <Link
          to="/products"
          className="px-8 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-colors rounded-xl shadow-lg"
        >
          {t('orders.startShopping', 'CONTINUE SHOPPING')}
        </Link>
      </div>
    )
  }

  return (
    <div className="container-custom py-8 sm:py-14 min-h-screen pb-32 sm:pb-16">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 pb-5 mb-8">
        <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-wide uppercase text-white">
          SHOPPING CART
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Review your items, check product details and place your order.
        </p>
      </div>

      {/* ── Free Delivery Status Banner ────────────────────────────────────── */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border mb-8 flex items-center justify-between gap-4 transition-colors ${
          isFreeDelivery
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
            : isDarkMode
            ? 'bg-luxury-charcoal/80 border-white/5 text-white'
            : 'bg-gray-50 border-gray-100 text-black'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isFreeDelivery ? 'bg-emerald-500/20 text-emerald-400' : 'bg-luxury-gold/20 text-luxury-gold'
            }`}
          >
            <FiTruck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold truncate">
              {isFreeDelivery ? (
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <FiCheckCircle /> 🚚 You have qualified for Free Delivery!
                </span>
              ) : (
                <span>
                  Delivery charges calculated from distance slabs (₹10 for 0–6 km, up to ₹50 nationwide).
                </span>
              )}
            </p>
            <p className="text-[11px] opacity-70 mt-0.5">
              {deliveryLabel || 'Authoritative delivery fee calculated per seller location.'}
            </p>
          </div>
        </div>
        {calculatingDelivery && (
          <span className="text-[11px] text-luxury-gold shrink-0 animate-pulse font-mono">
            Calculating…
          </span>
        )}
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
        {/* LEFT COLUMN: Cart Product Cards */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {cartItems.map((item) => {
              const prodId = item.productId || item.id
              const isStockAvailable = item.isInStock !== false && (item.availableStock === undefined || item.availableStock > 0)
              const maxStock = item.availableStock !== undefined ? item.availableStock : 99

              // Extract attributes for Green Box area
              const attrs = item.attributes || {}
              const variant = item.variant || {}

              // Non-empty details list for the Green Box
              const detailFields = [
                item.brand ? { label: 'Brand', val: item.brand } : null,
                item.category ? { label: 'Category', val: item.category } : null,
                attrs.material || variant.material ? { label: 'Material', val: attrs.material || variant.material } : null,
                variant.color || attrs.color ? { label: 'Colour', val: variant.color || attrs.color } : null,
                variant.size ? { label: 'Size', val: variant.size } : null,
                variant.length ? { label: 'Length', val: variant.length } : null,
                attrs.fit ? { label: 'Fit', val: attrs.fit } : null,
                attrs.pattern ? { label: 'Pattern', val: attrs.pattern } : null,
                item.sku ? { label: 'SKU', val: item.sku } : null,
                item.shopName ? { label: 'Seller', val: item.shopName } : null,
                {
                  label: 'Availability',
                  val: isStockAvailable ? '● In Stock' : 'Out of stock',
                  isStatus: true,
                  inStock: isStockAvailable
                }
              ].filter(Boolean)

              return (
                <motion.div
                  key={`${item._id || prodId}-${JSON.stringify(item.variant || {})}`}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 sm:p-6 rounded-2xl border ${
                    isDarkMode ? 'bg-luxury-charcoal/90 border-white/10' : 'bg-white border-gray-200'
                  } shadow-xl relative overflow-hidden transition-all`}
                >
                  {/* Card Main Info Row */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Product Image */}
                    <Link
                      to={`/products/${prodId}`}
                      className="w-full sm:w-32 aspect-[3/4] sm:aspect-square rounded-xl overflow-hidden bg-black/40 shrink-0 block group"
                    >
                      <img
                        src={item.image || '/assets/style-street-logo.png'}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = '/assets/style-street-logo.png'
                        }}
                      />
                    </Link>

                    {/* Content Column */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        {/* Title & Remove */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h3 className="font-serif font-bold text-base sm:text-lg hover:text-luxury-gold transition-colors line-clamp-1">
                              <Link to={`/products/${prodId}`}>{item.name}</Link>
                            </h3>
                            {item.shortDescription && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                {item.shortDescription}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item._id || prodId, item.variant)}
                            title="Remove from Cart"
                            className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>

                        {/* Brand, Category & SKU Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-gray-400">
                          {item.brand && (
                            <span className="font-semibold text-white">
                              Brand: <span className="text-luxury-gold">{item.brand}</span>
                            </span>
                          )}
                          {item.category && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 uppercase">
                              {item.category}
                            </span>
                          )}
                          {item.sku && (
                            <span className="font-mono text-[10px] opacity-70">
                              SKU: {item.sku}
                            </span>
                          )}
                        </div>

                        {/* Pricing & Taxes */}
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-lg sm:text-xl font-bold text-luxury-gold font-mono">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </span>
                          {item.originalPrice > item.price && (
                            <span className="text-xs line-through opacity-40 font-mono">
                              ₹{(item.originalPrice * item.quantity).toLocaleString()}
                            </span>
                          )}
                          <span className="text-[11px] text-emerald-400 font-medium">
                            Taxes included
                          </span>
                        </div>
                      </div>

                      {/* Variant Selection Display */}
                      {item.variant && Object.keys(item.variant).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                          {item.variant.size && (
                            <span className="text-xs px-2.5 py-1 rounded-md border border-luxury-gold/30 bg-luxury-gold/5 font-mono">
                              Size: <strong>{item.variant.size}</strong>
                            </span>
                          )}
                          {item.variant.color && (
                            <span className="text-xs px-2.5 py-1 rounded-md border border-white/10 bg-white/5 font-mono">
                              Colour: <strong>{item.variant.color}</strong>
                            </span>
                          )}
                          {item.variant.length && (
                            <span className="text-xs px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 font-mono text-emerald-300">
                              Length: <strong>{item.variant.length}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── 4. PRODUCT DETAILS – GREEN BOX AREA ─────────────────── */}
                  {detailFields.length > 0 && (
                    <div className="mt-4 p-3.5 sm:p-4 rounded-xl border border-emerald-500/25 bg-emerald-950/15 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-emerald-500/15">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Product Details
                        </span>
                        {item.shopName && (
                          <span className="text-[10px] text-gray-400 truncate">
                            Fulfilled by <strong className="text-white">{item.shopName}</strong>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-2 gap-x-4 text-xs">
                        {detailFields.map((f, i) => (
                          <div key={i} className="min-w-0">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-mono">
                              {f.label}
                            </span>
                            {f.isStatus ? (
                              <span
                                className={`font-semibold flex items-center gap-1 mt-0.5 ${
                                  f.inStock ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {f.val}
                              </span>
                            ) : (
                              <span className="font-medium text-white truncate block mt-0.5">
                                {f.val}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Card Bottom Actions & Quantity Selector ─────────────── */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-medium">Quantity:</span>
                      <div className="flex items-center border border-luxury-gold/40 rounded-lg overflow-hidden bg-black/20">
                        <button
                          onClick={() => updateCartItem(item._id || prodId, item.quantity - 1, item.variant)}
                          disabled={item.quantity <= 1}
                          className="px-3 py-1.5 text-sm hover:text-luxury-gold disabled:opacity-30 transition-colors"
                        >
                          <FiMinus size={12} />
                        </button>
                        <span className="px-3 text-xs font-bold font-mono text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartItem(item._id || prodId, item.quantity + 1, item.variant)}
                          disabled={item.quantity >= maxStock}
                          className="px-3 py-1.5 text-sm hover:text-luxury-gold disabled:opacity-30 transition-colors"
                        >
                          <FiPlus size={12} />
                        </button>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        ● In Stock
                      </span>
                    </div>

                    {/* Center: Secondary actions (Wishlist, Share) */}
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        onClick={() => handleMoveToWishlist(item)}
                        className="flex items-center gap-1 text-gray-300 hover:text-pink-400 transition-colors font-medium p-1.5"
                      >
                        <FiHeart size={14} className="text-pink-500" /> Move to Wishlist
                      </button>
                      <button
                        onClick={() => handleShare(item)}
                        className="flex items-center gap-1 text-gray-300 hover:text-luxury-gold transition-colors font-medium p-1.5"
                      >
                        <FiShare2 size={14} /> Share
                      </button>
                    </div>

                    {/* Right: Primary CTAs [View Details] [⚡ Buy Now] */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Link
                        to={`/products/${prodId}`}
                        className="px-4 py-2 border border-white/20 text-white rounded-lg text-xs font-semibold hover:border-luxury-gold hover:text-luxury-gold transition-colors flex items-center gap-1"
                      >
                        <FiEye size={13} /> View Details
                      </Link>
                      <button
                        onClick={() => handleBuyNow(item)}
                        className="px-4 py-2 bg-luxury-gold text-luxury-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-yellow-400 active:scale-95 transition-all flex items-center gap-1 shadow-md"
                      >
                        <FiZap size={13} /> Buy Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Cart Bottom Links */}
          <div className="flex justify-between items-center pt-2">
            <Link
              to="/products"
              className="text-xs font-bold tracking-widest text-luxury-gold uppercase hover:underline"
            >
              ← {t('cart.continueShopping', 'Continue Shopping')}
            </Link>
            <button
              onClick={clearCart}
              className="text-xs font-bold tracking-widest text-red-500 uppercase hover:underline"
            >
              {t('cart.clearCart', 'Clear Shopping Cart')}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Coupons & Order Summary */}
        <div className="space-y-6">
          {/* ── 11. COUPONS & OFFERS SECTION ───────────────────────────────── */}
          <div
            className={`p-6 rounded-2xl border ${
              isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-gray-200 text-black'
            } shadow-lg`}
          >
            <h3 className="text-xs uppercase tracking-widest text-luxury-gold font-bold mb-4 flex items-center gap-1.5">
              <FiPercent /> Coupons & Offers
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ENTER CODE"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon}
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-luxury-gold outline-none uppercase font-mono tracking-wider text-white"
              />
              {appliedCoupon ? (
                <button
                  onClick={handleRemoveCoupon}
                  className="px-4 py-3 bg-red-500/20 text-red-400 font-bold text-xs uppercase rounded-xl hover:bg-red-500/30 transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => handleApplyCoupon(couponCode)}
                  disabled={applyingCoupon}
                  className="px-5 py-3 bg-luxury-gold text-luxury-black font-bold text-xs uppercase rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-colors shadow"
                >
                  {applyingCoupon ? 'Applying…' : 'APPLY'}
                </button>
              )}
            </div>

            {appliedCoupon && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400">
                <span>
                  Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{discountAmount.toLocaleString()})
                </span>
                <FiCheckCircle />
              </div>
            )}

            <button
              onClick={() => setShowCouponsDrawer(true)}
              className="text-xs text-luxury-gold font-semibold hover:underline mt-4 flex items-center gap-1.5"
            >
              <FiPercent /> View Available Store Coupons
            </button>
          </div>

          {/* ── 12. ORDER SUMMARY ──────────────────────────────────────────── */}
          <div
            className={`p-6 rounded-2xl border ${
              isDarkMode ? 'bg-luxury-charcoal border-white/10 text-white' : 'bg-white border-gray-200 text-black'
            } shadow-lg`}
          >
            <h2 className="text-lg font-serif font-bold mb-6 tracking-wider uppercase">
              ORDER SUMMARY
            </h2>

            <div className="space-y-4 mb-6 pb-6 border-b border-white/10 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Subtotal</span>
                <span className="font-bold font-mono">₹{cartTotal.toLocaleString()}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-mono font-bold">-₹{discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="opacity-70">Shipping</span>
                <span className={`font-mono font-bold ${isFreeDelivery ? 'text-emerald-400' : ''}`}>
                  {isFreeDelivery ? 'FREE' : `₹${deliveryFee.toLocaleString()}`}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="opacity-70">Taxes</span>
                <span className="text-gray-300">Included</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline mb-8">
              <span className="text-base font-bold uppercase tracking-wider">Grand Total</span>
              <span className="text-2xl sm:text-3xl font-bold text-luxury-gold font-mono">
                ₹{finalGrandTotal.toLocaleString()}
              </span>
            </div>

            <Link
              to="/checkout"
              className="w-full py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 active:scale-95 transition-all text-center flex items-center justify-center gap-2 rounded-xl shadow-xl"
            >
              PROCEED TO CHECKOUT <FiArrowRight size={16} />
            </Link>

            {/* Note: In accordance with Section 2, the promotional security/returns strip below PROCEED TO CHECKOUT is completely removed */}
          </div>
        </div>
      </div>

      {/* ── STORE COUPONS DRAWER (Dynamic from MongoDB) ────────────────────── */}
      <AnimatePresence>
        {showCouponsDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className={`w-full max-w-md h-full p-6 flex flex-col justify-between overflow-y-auto ${
                isDarkMode ? 'bg-luxury-black text-white' : 'bg-white text-black'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <h3 className="text-lg font-serif font-bold tracking-wide flex items-center gap-2">
                    <FiPercent className="text-luxury-gold" /> STORE COUPONS & OFFERS
                  </h3>
                  <button
                    onClick={() => setShowCouponsDrawer(false)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <FiX size={22} className="text-gray-400 hover:text-white" />
                  </button>
                </div>

                {loadingCoupons ? (
                  <p className="text-sm text-gray-400 animate-pulse">Loading active offers…</p>
                ) : availableCoupons.length === 0 ? (
                  <p className="text-sm text-gray-400">No active store coupons at this moment.</p>
                ) : (
                  <div className="space-y-4">
                    {availableCoupons.map((c) => {
                      const isApplicable = cartTotal >= (c.minPurchaseAmount || 0)
                      return (
                        <div
                          key={c._id || c.code}
                          className={`p-4 border rounded-xl flex flex-col justify-between transition-all ${
                            isApplicable
                              ? 'border-luxury-gold/40 bg-luxury-gold/5'
                              : 'border-white/10 opacity-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-mono font-bold text-lg text-luxury-gold tracking-wider">
                                {c.code}
                              </span>
                              {c.minPurchaseAmount > 0 && (
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Min order: ₹{c.minPurchaseAmount.toLocaleString()}
                                </p>
                              )}
                            </div>
                            {isApplicable ? (
                              <button
                                onClick={() => {
                                  handleApplyCoupon(c.code)
                                  setShowCouponsDrawer(false)
                                }}
                                className="px-3 py-1 bg-luxury-gold text-luxury-black font-bold text-xs uppercase rounded-lg hover:bg-yellow-400 shadow"
                              >
                                Apply
                              </button>
                            ) : (
                              <span className="text-[10px] uppercase font-mono text-gray-400">
                                Ineligible
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-300 mt-1">{c.description}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10">
                <button
                  onClick={() => setShowCouponsDrawer(false)}
                  className="w-full py-3 bg-white/10 text-white font-bold text-xs uppercase rounded-xl hover:bg-white/20 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE STICKY CHECKOUT BAR ─────────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 sm:hidden safe-pb border-t ${
          isDarkMode ? 'bg-luxury-black/95 border-luxury-gold/20' : 'bg-white/95 border-gray-200'
        } backdrop-blur-xl shadow-2xl`}
      >
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-luxury-gold">Total Amount</p>
            <p className="text-lg font-bold text-luxury-gold font-mono">
              ₹{finalGrandTotal.toLocaleString()}
            </p>
          </div>
          <Link
            to="/checkout"
            className="flex-grow max-w-[200px] py-3.5 px-4 bg-luxury-gold text-luxury-black font-bold tracking-wider text-xs uppercase hover:bg-yellow-400 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 rounded-xl shadow-lg"
          >
            Checkout <FiArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Cart
