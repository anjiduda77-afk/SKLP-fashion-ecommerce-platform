import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCheckCircle, FiMapPin, FiTruck, FiAlertCircle, FiPlus, FiStar, FiZap, FiShield, FiKey, FiX } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@context/CartContext'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { userService, orderService, cartService, deliveryFeeService } from '@services/apiServices'
import { useCurrency } from '../context/CurrencyContext'
import { toast } from 'react-toastify'

import { loadRazorpayScript } from '@utils/loadRazorpay'

// ── Constants ──────────────────────────────────────────────────────────────────
const DEBOUNCE_MS = 900   // wait 900 ms after address changes before calling API
const PLATFORM_FEE_DEFAULT = 5  // fallback if backend not yet called

function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { cartItems, cartTotal, removeFromCart, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { isDarkMode } = useTheme()
  const { formatPrice } = useCurrency()

  // ── Buy Now Isolation Mode ──────────────────────────────────────────────────
  const isBuyNowMode = Boolean(location.state?.isBuyNow && location.state?.buyNowItem)
  const buyNowItem = isBuyNowMode ? location.state.buyNowItem : null

  // Items and subtotal under checkout (either single Buy Now product or full cart)
  const checkoutItems = useMemo(() => {
    if (isBuyNowMode && buyNowItem) {
      return [buyNowItem]
    }
    return cartItems
  }, [isBuyNowMode, buyNowItem, cartItems])

  const checkoutSubtotal = useMemo(() => {
    if (isBuyNowMode && buyNowItem) {
      return (buyNowItem.price || 0) * (buyNowItem.quantity || 1)
    }
    return cartTotal
  }, [isBuyNowMode, buyNowItem, cartTotal])

  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)

  // ── Saved Addresses (from user profile) ──────────────────────────────────
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null) // null = "New Address"

  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  })
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')

  // ── Razorpay Test Simulation Modal State ─────────────────────────────────
  const [sandboxModal, setSandboxModal] = useState(null)
  const [customRzpKey, setCustomRzpKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)

  // ── Delivery Fee State (always fetched from server) ────────────────────────
  const [deliveryInfo, setDeliveryInfo] = useState({
    distanceKm: null,
    deliveryFee: 0,
    deliveryLabel: '',
    deliveryUnavailable: false,
    deliveryMethod: 'self_delivery',
    platformFeePercent: PLATFORM_FEE_DEFAULT,
    loading: false,
    error: null,
    calculated: false
  })

  const debounceTimer = useRef(null)

  // Derived totals — always computed from server-verified breakdown with NaN guards
  const safePlatformPercent = isFinite(deliveryInfo.platformFeePercent) ? deliveryInfo.platformFeePercent : PLATFORM_FEE_DEFAULT
  const platformFee = isFinite(checkoutSubtotal) ? parseFloat(((checkoutSubtotal * safePlatformPercent) / 100).toFixed(2)) : 0
  const deliveryFee = (isFinite(deliveryInfo.deliveryFee) && deliveryInfo.deliveryFee >= 0) ? deliveryInfo.deliveryFee : 0
  const orderFinalTotal = Math.max(
    0,
    parseFloat(((isFinite(checkoutSubtotal) ? checkoutSubtotal : 0) + platformFee + deliveryFee - discountAmount).toFixed(2))
  )

  // ── Address change triggers debounced fee recalculation ───────────────────
  const fetchDeliveryFee = useCallback(async (address) => {
    const { city, postalCode } = address
    if (!city || !postalCode || postalCode.length < 5) return

    setDeliveryInfo((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const payload = {
        ...address,
        subtotal: checkoutSubtotal,
        items: checkoutItems.map(it => ({
          productId: it.productId || it.id,
          sellerId: it.sellerId,
          price: it.price,
          quantity: it.quantity
        }))
      }
      const res = await deliveryFeeService.calculate(payload)
      if (res.data?.success) {
        const d = res.data
        const isUnavailable = Boolean(d.deliveryUnavailable)
        setDeliveryInfo({
          distanceKm: isFinite(d.distanceKm) ? d.distanceKm : null,
          deliveryFee: isFinite(d.deliveryFee) && d.deliveryFee >= 0 ? d.deliveryFee : 0,
          deliveryLabel: d.deliveryLabel || '',
          deliveryUnavailable: isUnavailable,
          deliveryMethod: d.deliveryMethod || 'self_delivery',
          platformFeePercent: isFinite(d.platformFeePercent) ? d.platformFeePercent : PLATFORM_FEE_DEFAULT,
          loading: false,
          error: isUnavailable ? (d.deliveryLabel || t('checkout.deliveryUnavailable', 'Delivery unavailable for this address')) : null,
          calculated: !isUnavailable
        })
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not calculate delivery fee. Please check your address.'
      setDeliveryInfo((prev) => ({
        ...prev,
        loading: false,
        deliveryUnavailable: false,
        error: msg,
        calculated: false
      }))
    }
  }, [checkoutSubtotal, checkoutItems, t])

  const handleAddressChange = useCallback((field, value) => {
    setShippingAddress((prev) => {
      const next = { ...prev, [field]: value }
      // Debounce: trigger fee recalculation 900ms after user stops typing
      if (field === 'city' || field === 'postalCode' || field === 'state') {
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
          fetchDeliveryFee(next)
        }, DEBOUNCE_MS)
      }
      return next
    })
  }, [fetchDeliveryFee])

  // ── Saved address picker handler ──────────────────────────────────────────
  const handleSelectSavedAddress = useCallback((addr) => {
    setSelectedAddressId(addr._id)
    const mapped = {
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || addr.pincode || '',
      country: addr.country || 'India'
    }
    setShippingAddress(mapped)
    if (addr.phone) setPhone(addr.phone)
    // Reset delivery fee and recalculate
    setDeliveryInfo((prev) => ({ ...prev, calculated: false, error: null }))
    if (mapped.city && mapped.postalCode) fetchDeliveryFee(mapped)
  }, [fetchDeliveryFee])

  const handleSelectNewAddress = useCallback(() => {
    setSelectedAddressId(null)
    setShippingAddress({ street: '', city: '', state: '', postalCode: '', country: 'India' })
    setDeliveryInfo((prev) => ({ ...prev, calculated: false, error: null, deliveryFee: 0 }))
  }, [])

  // ── Load user profile & default address ──────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')

      const fetchUserAddress = async () => {
        try {
          const res = await userService.getAddresses()
          if (res.data?.addresses?.length > 0) {
            setSavedAddresses(res.data.addresses)
            const defAddr = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[0]
            // Auto-select the default/first saved address
            handleSelectSavedAddress(defAddr)
          }
        } catch (err) {
          console.warn('Failed to load user address:', err.message)
        }
      }
      fetchUserAddress()
    }
  }, [isAuthenticated, user, fetchDeliveryFee, handleSelectSavedAddress])

  // ── Coupon application ────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) { toast.error('Please enter a coupon code'); return }
    setValidatingCoupon(true)
    try {
      const res = await cartService.applyCoupon(couponCode.toUpperCase().trim())
      if (res.data.success) {
        setAppliedCoupon(res.data.coupon)
        setDiscountAmount(res.data.discountAmount || 0)
        toast.success(`Coupon "${couponCode.toUpperCase()}" applied! 🎉`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired coupon code')
    } finally {
      setValidatingCoupon(false)
    }
  }

  // ── Place Order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async (e) => {
    e.preventDefault()

    if (!firstName || !lastName || !phone || !email) {
      toast.error('Please fill in all required fields')
      return
    }
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      toast.error('Please provide a complete shipping address')
      return
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method')
      return
    }
    if (checkoutItems.length === 0) {
      toast.error('Your checkout is empty')
      return
    }
    if (!deliveryInfo.calculated) {
      // If address is complete, try to calculate on-the-spot before blocking
      if (shippingAddress.city && shippingAddress.postalCode && shippingAddress.postalCode.length >= 5) {
        toast.info('Calculating delivery fee for your address…')
        await fetchDeliveryFee(shippingAddress)
        // If still not calculated after attempt, show error
        if (!deliveryInfo.calculated) {
          toast.error('Unable to calculate delivery fee. Please check your address and try again.')
          return
        }
      } else {
        toast.error('Please enter your city and 6-digit postal code to calculate delivery charges.')
        return
      }
    }

    setLoading(true)
    try {
      let orderResult

      if (paymentMethod === 'cod') {
        orderResult = await createCODOrder()
        if (orderResult?.success) {
          toast.success('Order placed successfully! 🎉')
          handleOrderSuccess(orderResult.order)
        }
      } else if (paymentMethod === 'razorpay') {
        await initRazorpayPayment()
      } else if (paymentMethod === 'upi') {
        orderResult = await initUPIPayment()
        if (orderResult?.success) {
          toast.success('Order placed successfully! 🎉')
          handleOrderSuccess(orderResult.order)
        }
      } else if (paymentMethod === 'card') {
        orderResult = await initCardPayment()
        if (orderResult?.success) {
          toast.success('Order placed successfully! 🎉')
          handleOrderSuccess(orderResult.order)
        }
      }
    } catch (err) {
      console.error('Order placement error:', err)
      toast.error(err.response?.data?.message || err.message || 'Failed to place order. Please try again.')
    } finally {
      if (paymentMethod !== 'razorpay') {
        setLoading(false)
      }
    }
  }

  // ── Success handler: clean only purchased items ───────────────────────────
  const handleOrderSuccess = (newOrder) => {
    if (isBuyNowMode) {
      if (buyNowItem?.cartItemId) {
        removeFromCart(buyNowItem.cartItemId, buyNowItem.variant)
      }
    } else {
      clearCart()
    }
    navigate('/orders', { state: { newOrder } })
  }

  // ── Payment handlers ──────────────────────────────────────────────────────
  const buildOrderPayload = (method) => ({
    shippingAddress,
    paymentMethod: method,
    phone,
    couponCode: appliedCoupon?.code,
    isBuyNow: isBuyNowMode,
    buyNowItem: isBuyNowMode ? buyNowItem : undefined,
    items: checkoutItems
  })

  const createCODOrder = async () => {
    const res = await orderService.createOrder(buildOrderPayload('cod'))
    return res.data
  }

  const handleSimulateSandboxPayment = async (order, rzpOrderId) => {
    setLoading(true)
    try {
      toast.info('Verifying sandbox payment…')
      const mockPayId = `pay_mock_${Date.now()}`
      const verifyRes = await orderService.verifyRazorpayPayment({
        orderId: order._id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: 'mock_signature_sandbox'
      })
      if (verifyRes.data?.success) {
        toast.success('Payment simulated successfully! Order confirmed. 🎉')
        setSandboxModal(null)
        handleOrderSuccess(verifyRes.data.order || order)
      } else {
        toast.error(verifyRes.data?.message || 'Sandbox verification failed.')
      }
    } catch (err) {
      console.error('Sandbox payment simulation error:', err)
      toast.error(err.response?.data?.message || 'Simulation verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateSandboxFailure = () => {
    toast.error('Payment cancelled / declined.')
    setSandboxModal(null)
    setLoading(false)
  }

  const handleLaunchWithCustomKey = async (key) => {
    if (!key || (!key.startsWith('rzp_test_') && !key.startsWith('rzp_live_'))) {
      toast.error('Please enter a valid key starting with rzp_test_ or rzp_live_')
      return
    }
    try {
      const modalData = sandboxModal
      setSandboxModal(null)
      await modalData.onLaunchReal(key.trim())
    } catch (err) {
      toast.error(err.message || 'Failed to initialize Razorpay with this key.')
    }
  }

  const initRazorpayPayment = async () => {
    // 1. Create order on backend first
    const res = await orderService.createOrder(buildOrderPayload('razorpay'))
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create order on server')

    const order = res.data.order
    const rzpOrderId = res.data.razorpayOrderId || order.razorpayOrderId
    const rawKeyId = res.data.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY || import.meta.env.VITE_RAZORPAY_KEY_ID || ''
    const isRealRzpKey = Boolean(
      rawKeyId &&
      !rawKeyId.includes('placeholder') &&
      !rawKeyId.includes('your_key') &&
      (rawKeyId.startsWith('rzp_test_') || rawKeyId.startsWith('rzp_live_'))
    )

    const launchRazorpayModal = async (keyToUse) => {
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check network connection.')
      }

      const options = {
        key: keyToUse,
        amount: Math.round((order.totalAmount || orderFinalTotal) * 100),
        currency: res.data.currency || 'INR',
        name: 'Style Street Fashion',
        description: `Order #${order.orderNumber || order._id}`,
        image: '/vite.svg',
        order_id: rzpOrderId && !rzpOrderId.includes('mock') && !rzpOrderId.includes('sandbox') ? rzpOrderId : undefined,
        handler: async (response) => {
          setLoading(true)
          try {
            toast.info('Verifying secure payment…')
            const verifyRes = await orderService.verifyRazorpayPayment({
              orderId: order._id,
              razorpayOrderId: response.razorpay_order_id || rzpOrderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            })
            if (verifyRes.data?.success) {
              toast.success('Payment verified successfully! Order is confirmed. 🎉')
              setSandboxModal(null)
              handleOrderSuccess(verifyRes.data.order || order)
            } else {
              toast.error(verifyRes.data?.message || 'Payment verification failed.')
            }
          } catch (err) {
            console.error('Razorpay verification error:', err)
            toast.error(err.response?.data?.message || 'Payment verification failed. Please contact support.')
          } finally {
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            toast.warn('Payment window closed without completing transaction.')
          }
        },
        prefill: {
          name: `${firstName} ${lastName}`.trim() || user?.name || '',
          email: email || user?.email || '',
          contact: phone || user?.phone || ''
        },
        notes: {
          orderId: order._id,
          orderNumber: order.orderNumber
        },
        theme: {
          color: '#D4AF37'
        }
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error)
        toast.error(`Payment failed: ${response.error?.description || 'Transaction declined'}`)
        setLoading(false)
        setSandboxModal({
          order,
          rzpOrderId,
          amount: order.totalAmount || orderFinalTotal,
          onLaunchReal: launchRazorpayModal,
          errorMessage: response.error?.description || 'Gateway transaction declined'
        })
      })
      razorpayInstance.open()
    }

    if (isRealRzpKey) {
      try {
        await launchRazorpayModal(rawKeyId)
      } catch (err) {
        console.warn('Real Razorpay initialization failed:', err.message)
        setSandboxModal({
          order,
          rzpOrderId,
          amount: order.totalAmount || orderFinalTotal,
          onLaunchReal: launchRazorpayModal,
          errorMessage: err.message
        })
      }
    } else {
      // In development / demo mode without live keys: show sleek interactive sandbox gateway
      setSandboxModal({
        order,
        rzpOrderId,
        amount: order.totalAmount || orderFinalTotal,
        onLaunchReal: launchRazorpayModal
      })
    }
  }

  const initUPIPayment = async () => {
    toast.info('Processing instant UPI payment…')
    const res = await orderService.createOrder(buildOrderPayload('upi'))
    return res.data
  }

  const initCardPayment = async () => {
    toast.info('Processing secure card payment…')
    const res = await orderService.createOrder(buildOrderPayload('card'))
    return res.data
  }

  // ── Delivery fee display helpers ──────────────────────────────────────────
  const DeliveryFeeDisplay = () => {
    if (deliveryInfo.loading) {
      return (
        <div className="flex items-center gap-2 text-xs opacity-60 animate-pulse">
          <FiTruck className="shrink-0" />
          <span>{t('checkout.calculatingDelivery', 'Calculating delivery fee…')}</span>
        </div>
      )
    }
    if (deliveryInfo.deliveryUnavailable || deliveryInfo.error) {
      return (
        <div className="flex items-start gap-2 text-xs text-red-400">
          <FiAlertCircle className="shrink-0 mt-0.5 text-red-400" />
          <div>
            <p className="font-semibold">{t('checkout.deliveryUnavailable', 'Delivery unavailable for this address')}</p>
            <p className="opacity-75 text-[11px] mt-0.5">{deliveryInfo.error || t('checkout.deliveryUnavailableDesc', 'The delivery address exceeds our maximum serviceable distance.')}</p>
          </div>
        </div>
      )
    }
    if (!deliveryInfo.calculated) {
      return (
        <div className="flex items-center gap-2 text-xs opacity-50">
          <FiMapPin className="shrink-0" />
          <span>{t('checkout.enterPinToCalculate', 'Enter your city and PIN code to calculate delivery fee')}</span>
        </div>
      )
    }
    return null
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="container-custom py-24 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <h1 className="text-3xl font-serif font-bold mb-6">Secure Checkout</h1>
        <p className="opacity-60 mb-8 max-w-sm">Please log in or register your Style Street account to access secure payment gateways.</p>
        <Link
          to="/login?redirect=/checkout"
          className="px-8 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-colors"
        >
          LOG IN TO SECURE CHECKOUT
        </Link>
      </div>
    )
  }

  // ── Shared input classes ──────────────────────────────────────────────────
  const inputCls = `w-full bg-transparent border rounded-lg p-3 text-sm outline-none transition-colors ${
    isDarkMode
      ? 'border-white/10 text-white focus:border-luxury-gold'
      : 'border-gray-200 text-gray-900 focus:border-luxury-gold'
  }`
  const labelCls = 'text-xs uppercase tracking-wider block mb-1 opacity-70'

  return (
    <div className="container-custom py-8 md:py-16 min-h-screen">
      <h1 className="text-2xl md:text-4xl font-serif font-bold mb-8 md:mb-12 tracking-wide uppercase">Secure Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* ── LEFT: Contact, Address, Payment ── */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">

          {/* 1. Contact Information */}
          <div className={`p-5 sm:p-8 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h2 className="text-xl font-serif font-bold mb-6 text-luxury-gold tracking-wide uppercase">
              1. Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required maxLength={10} placeholder="e.g. 9876543210"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* 2. Delivery Address */}
          <div className={`p-5 sm:p-8 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h2 className="text-xl font-serif font-bold mb-6 text-luxury-gold tracking-wide uppercase">
              2. Delivery Address
            </h2>

            {/* ── Saved Address Switcher ── */}
            {savedAddresses.length > 0 && (
              <div className="mb-6">
                <p className={`text-xs uppercase tracking-wider mb-3 font-semibold ${
                  isDarkMode ? 'text-white/50' : 'text-gray-400'
                }`}>
                  Saved Addresses
                </p>
                <div className="flex flex-wrap gap-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr._id
                    return (
                      <button
                        key={addr._id}
                        type="button"
                        id={`saved-addr-${addr._id}`}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`relative text-left p-3 rounded-xl border-2 transition-all duration-200 min-w-[160px] max-w-[220px] flex-shrink-0 ${
                          isSelected
                            ? 'border-luxury-gold bg-luxury-gold/10 shadow-sm'
                            : isDarkMode
                              ? 'border-white/10 bg-white/5 hover:border-luxury-gold/40'
                              : 'border-gray-200 bg-gray-50 hover:border-luxury-gold/40'
                        }`}
                      >
                        {addr.isDefault && (
                          <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] font-bold text-luxury-gold">
                            <FiStar size={9} className="fill-luxury-gold" /> Default
                          </span>
                        )}
                        <p className={`text-xs font-bold mb-0.5 pr-10 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {addr.label || addr.type || 'Address'}
                        </p>
                        <p className={`text-[10px] leading-tight line-clamp-2 ${
                          isDarkMode ? 'text-white/60' : 'text-gray-500'
                        }`}>
                          {addr.street}, {addr.city}
                        </p>
                        <p className={`text-[10px] font-mono mt-0.5 ${
                          isDarkMode ? 'text-white/40' : 'text-gray-400'
                        }`}>
                          {addr.postalCode || addr.pincode}
                        </p>
                        {isSelected && (
                          <div className="absolute bottom-1.5 right-1.5">
                            <FiCheckCircle size={12} className="text-luxury-gold" />
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {/* + New Address card */}
                  <button
                    type="button"
                    id="checkout-new-address-btn"
                    onClick={handleSelectNewAddress}
                    className={`text-left p-3 rounded-xl border-2 border-dashed transition-all duration-200 min-w-[120px] flex flex-col items-center justify-center gap-1.5 ${
                      selectedAddressId === null
                        ? 'border-luxury-gold bg-luxury-gold/10'
                        : isDarkMode
                          ? 'border-white/10 hover:border-luxury-gold/40 text-white/50'
                          : 'border-gray-200 hover:border-luxury-gold/40 text-gray-400'
                    }`}
                  >
                    <FiPlus size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      New Address
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Manual address form (always visible; populated by saved selection or blank for new) ── */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Street Address</label>
                <input
                  type="text" value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  required placeholder="Apartment, suite, street, building…"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>City</label>
                  <input
                    type="text" value={shippingAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    required className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>State / Province</label>
                  <input
                    type="text" value={shippingAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    required className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Postal Code (PIN)</label>
                  <input
                    type="text" value={shippingAddress.postalCode}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required maxLength={6} placeholder="6-digit PIN"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input type="text" value={shippingAddress.country} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                </div>
              </div>

              {/* Live delivery fee status */}
              <div className={`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <DeliveryFeeDisplay />
                {deliveryInfo.calculated && !deliveryInfo.loading && !deliveryInfo.deliveryUnavailable && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FiTruck className={`shrink-0 ${deliveryFee === 0 ? 'text-green-400' : 'text-amber-400'}`} />
                      <p className={`text-sm font-semibold ${deliveryFee === 0 ? 'text-green-400' : isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {deliveryInfo.deliveryLabel || (deliveryFee === 0 ? t('checkout.freeDelivery', 'Free Delivery') : `₹${deliveryFee}`)}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      deliveryInfo.deliveryMethod === 'delivery_partner'
                        ? 'border-blue-400/40 text-blue-400 bg-blue-400/10'
                        : 'border-luxury-gold/40 text-luxury-gold bg-luxury-gold/10'
                    }`}>
                      {deliveryInfo.deliveryMethod === 'delivery_partner'
                        ? t('checkout.deliveryPartner', 'Delivery Partner')
                        : t('checkout.selfDelivery', 'Self Delivery')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div className={`p-5 sm:p-8 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h2 className="text-xl font-serif font-bold mb-6 text-luxury-gold tracking-wide uppercase">
              3. Payment Method
            </h2>
            <div className="space-y-3">
              {[
                { id: 'cod',     icon: '💵', label: 'Cash on Delivery (COD)',         sub: 'Pay with cash upon secure package delivery.' },
                { id: 'card',    icon: '💳', label: 'Credit / Debit Card',             sub: 'Visa, Mastercard, RuPay via secure gateway.' },
                { id: 'upi',     icon: '📲', label: 'UPI (GPay, PhonePe, Paytm)',     sub: 'Instant payment via your preferred UPI app.' },
                { id: 'razorpay',icon: '⚡', label: 'Razorpay',                        sub: 'Secure all-in-one payment via Razorpay.' }
              ].map(({ id, icon, label, sub }) => (
                <div
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                    paymentMethod === id
                      ? 'border-luxury-gold bg-luxury-gold/10'
                      : isDarkMode
                        ? 'border-white/10 bg-white/5 hover:border-luxury-gold/40'
                        : 'border-gray-200 bg-gray-50 hover:border-luxury-gold/40'
                  }`}
                >
                  <span className="text-2xl mr-4">{icon}</span>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>{sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    paymentMethod === id ? 'border-luxury-gold bg-luxury-gold' : isDarkMode ? 'border-white/20' : 'border-gray-300'
                  }`}>
                    {paymentMethod === id && <div className="w-2 h-2 rounded-full bg-luxury-black" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Order Summary ── */}
        <div>
          <div className={`p-5 sm:p-8 rounded-2xl border sticky top-24 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h2 className="text-xl font-serif font-bold mb-6 tracking-wide uppercase">Order Summary</h2>

            {isBuyNowMode && (
              <div className="mb-4 p-2.5 rounded-xl bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold"><FiZap /> Buy Now (Single Product)</span>
                <Link to="/cart" className="underline hover:text-white text-[11px]">View Full Cart</Link>
              </div>
            )}

            {/* Checkout items */}
            <div className="space-y-3 mb-6 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
              {checkoutItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <img src={item.image || '/assets/style-street-logo.png'} alt={item.name} className="w-12 h-14 object-cover rounded-lg shrink-0 bg-black/20" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs line-clamp-1">{item.name}</p>
                    <p className={`text-[10px] ${isDarkMode ? 'opacity-50' : 'text-gray-500'}`}>
                      Qty: {item.quantity} {item.variant?.size ? `• Size: ${item.variant.size}` : ''} {item.variant?.length ? `• ${item.variant.length}` : ''}
                    </p>
                  </div>
                  <span className="font-bold text-xs text-luxury-gold shrink-0 font-mono">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Box */}
            <div className={`mb-6 p-4 rounded-xl border ${isDarkMode ? 'border-luxury-gold/20 bg-luxury-gold/5' : 'border-yellow-200 bg-yellow-50'}`}>
              <label className="text-xs font-bold uppercase tracking-wider text-luxury-gold block mb-2">
                Promo / Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text" value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. SS20"
                  className={`flex-1 bg-transparent border rounded-lg px-3 py-2 text-xs uppercase font-mono outline-none focus:border-luxury-gold ${isDarkMode ? 'border-white/10 text-white' : 'border-gray-200 text-gray-900'}`}
                />
                <button
                  type="button" onClick={handleApplyCoupon} disabled={validatingCoupon}
                  className="px-4 py-2 bg-luxury-gold text-black font-bold text-xs rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-all"
                >
                  {validatingCoupon ? '…' : 'Apply'}
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-xs font-bold text-green-400 flex items-center gap-1 mt-2">
                  ✓ {appliedCoupon.code} — saving {formatPrice(discountAmount)}
                </p>
              )}
            </div>

            {/* ── Price Breakdown ── */}
            <div className={`space-y-0 mb-5 pb-5 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>

              {/* Row helper */}
              {[  
                {
                  label: 'Subtotal',
                  value: formatPrice(checkoutSubtotal),
                  labelClass: isDarkMode ? 'opacity-60' : 'text-gray-500',
                  valueClass: 'font-semibold',
                  show: true
                },
                {
                  label: 'Discount',
                  value: `− ${formatPrice(discountAmount)}`,
                  labelClass: 'text-green-400',
                  valueClass: 'font-bold text-green-400',
                  show: discountAmount > 0
                },
                {
                  label: `Platform Fee (${deliveryInfo.platformFeePercent}%)`,
                  value: formatPrice(platformFee),
                  labelClass: isDarkMode ? 'opacity-60' : 'text-gray-500',
                  valueClass: 'font-semibold',
                  show: true
                },
                {
                  label: 'Delivery Fee',
                  value: deliveryInfo.loading
                    ? 'Calculating…'
                    : deliveryInfo.calculated
                      ? (deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee))
                      : '—',
                  labelClass: isDarkMode ? 'opacity-60' : 'text-gray-500',
                  valueClass: deliveryInfo.loading
                    ? 'text-xs opacity-50 animate-pulse'
                    : deliveryFee === 0 && deliveryInfo.calculated
                      ? 'font-bold text-green-400'
                      : 'font-semibold',
                  show: true
                }
              ].map(({ label, value, labelClass, valueClass, show }) =>
                show ? (
                  <div key={label} className="flex justify-between items-center py-2.5 text-sm">
                    <span className={labelClass}>{label}</span>
                    <span className={valueClass}>{value}</span>
                  </div>
                ) : null
              )}
            </div>

            {/* ── Final Total ── */}
            <div className={`flex justify-between items-center py-3 mb-6 rounded-xl px-4 ${
              isDarkMode ? 'bg-luxury-gold/10' : 'bg-amber-50'
            }`}>
              <span className="text-sm font-bold uppercase tracking-widest">Final Total</span>
              <span className="text-2xl font-bold text-luxury-gold">
                {formatPrice(orderFinalTotal)}
              </span>
            </div>

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={loading || !deliveryInfo.calculated || deliveryInfo.deliveryUnavailable}
              className="w-full py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-luxury-black border-t-transparent" />
                  {t('checkout.placingOrder', 'Placing Order…')}
                </>
              ) : deliveryInfo.deliveryUnavailable ? (
                <>
                  <FiAlertCircle />
                  {t('checkout.deliveryUnavailable', 'Delivery Unavailable')}
                </>
              ) : !deliveryInfo.calculated ? (
                <>
                  <FiMapPin />
                  Enter Address to Continue
                </>
              ) : (
                <>
                  {t('checkout.placeOrder', 'PLACE ORDER')} <FiCheckCircle />
                </>
              )}
            </button>

            {/* Security badges */}
            <div className="mt-5 flex justify-center gap-4 opacity-40">
              <span className="text-[10px]">🔒 256-bit SSL</span>
              <span className="text-[10px]">🛡️ Secure Checkout</span>
              <span className="text-[10px]">✅ PCI Compliant</span>
            </div>
          </div>
        </div>
      </form>

      {/* ── Razorpay Sandbox / Simulation Modal ── */}
      <AnimatePresence>
        {sandboxModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
                isDarkMode ? 'bg-[#18181b] border-luxury-gold/30 text-white' : 'bg-white border-amber-300 text-gray-900'
              }`}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleSimulateSandboxFailure}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <FiX size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-luxury-gold/20 border border-luxury-gold/40 flex items-center justify-center text-luxury-gold">
                  <FiShield size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-luxury-gold">
                    Razorpay Gateway
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/40">
                      Sandbox Mode
                    </span>
                  </div>
                </div>
              </div>

              {sandboxModal.errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                  <FiAlertCircle className="shrink-0 mt-0.5" />
                  <span>{sandboxModal.errorMessage}</span>
                </div>
              )}

              <p className="text-xs opacity-70 mb-4">
                No active live gateway credentials detected in environment. You can simulate instant payment confirmation or provide a real Razorpay test key.
              </p>

              <div className={`p-4 rounded-xl mb-5 space-y-2 text-xs ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span className="opacity-60">Order Reference:</span>
                  <span className="font-mono font-bold text-luxury-gold">
                    {sandboxModal.order?.orderNumber || sandboxModal.order?._id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Customer:</span>
                  <span>{firstName} {lastName}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-white/10 font-bold">
                  <span>Payable Amount:</span>
                  <span className="text-luxury-gold font-mono text-base">
                    ₹{Number(sandboxModal.amount || orderFinalTotal).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  id="sandbox-success-btn"
                  onClick={() => handleSimulateSandboxPayment(sandboxModal.order, sandboxModal.rzpOrderId)}
                  disabled={loading}
                  className="w-full py-3.5 bg-luxury-gold text-luxury-black font-bold tracking-wider text-xs uppercase hover:bg-yellow-400 transition-all rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-luxury-gold/20"
                >
                  <FiCheckCircle size={16} />
                  Simulate Successful Payment
                </button>

                <button
                  type="button"
                  onClick={handleSimulateSandboxFailure}
                  disabled={loading}
                  className={`w-full py-2.5 border rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                    isDarkMode ? 'border-white/20 hover:bg-white/5 text-white/70' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Cancel / Decline Payment
                </button>
              </div>

              {/* Collapsible real key option */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-[11px] text-luxury-gold hover:underline flex items-center gap-1 mx-auto"
                >
                  <FiKey size={12} />
                  {showKeyInput ? 'Hide Key Configuration' : 'Have a real Razorpay Test Key? Click here'}
                </button>

                {showKeyInput && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. rzp_test_xxxxxxxxxxxx"
                      value={customRzpKey}
                      onChange={(e) => setCustomRzpKey(e.target.value)}
                      className={`w-full bg-transparent border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-luxury-gold ${
                        isDarkMode ? 'border-white/20 text-white' : 'border-gray-300 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleLaunchWithCustomKey(customRzpKey)}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 text-luxury-gold font-bold text-xs rounded-lg transition-colors"
                    >
                      Launch Real Razorpay Gateway
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Checkout
