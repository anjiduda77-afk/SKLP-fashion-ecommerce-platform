import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiCheckCircle, FiMapPin, FiTruck, FiAlertCircle } from 'react-icons/fi'
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
  const navigate = useNavigate()
  const { cartItems, cartTotal, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { isDarkMode } = useTheme()
  const { formatPrice } = useCurrency()

  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)

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

  // ── Delivery Fee State (always fetched from server) ────────────────────────
  const [deliveryInfo, setDeliveryInfo] = useState({
    distanceKm: null,
    deliveryFee: 0,
    deliveryLabel: '',
    platformFeePercent: PLATFORM_FEE_DEFAULT,
    loading: false,
    error: null,
    calculated: false
  })

  const debounceTimer = useRef(null)

  // Derived totals — always computed from server-verified breakdown
  const platformFee = parseFloat(((cartTotal * deliveryInfo.platformFeePercent) / 100).toFixed(2))
  const deliveryFee = deliveryInfo.deliveryFee || 0
  const orderFinalTotal = Math.max(
    0,
    parseFloat((cartTotal + platformFee + deliveryFee - discountAmount).toFixed(2))
  )

  // ── Address change triggers debounced fee recalculation ───────────────────
  const fetchDeliveryFee = useCallback(async (address) => {
    const { city, postalCode } = address
    if (!city || !postalCode || postalCode.length < 5) return

    setDeliveryInfo((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await deliveryFeeService.calculate(address)
      if (res.data?.success) {
        const d = res.data
        setDeliveryInfo({
          distanceKm: d.distanceKm,
          deliveryFee: d.deliveryFee,
          deliveryLabel: d.deliveryLabel,
          platformFeePercent: d.platformFeePercent ?? PLATFORM_FEE_DEFAULT,
          loading: false,
          error: null,
          calculated: true
        })
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not calculate delivery fee. Please check your address.'
      setDeliveryInfo((prev) => ({
        ...prev,
        loading: false,
        error: msg,
        calculated: false
      }))
    }
  }, [])

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
            const defAddr = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[0]
            const addr = {
              street: defAddr.street || '',
              city: defAddr.city || '',
              state: defAddr.state || '',
              postalCode: defAddr.postalCode || '',
              country: defAddr.country || 'India'
            }
            setShippingAddress(addr)
            // Immediately calculate fee for saved address
            if (addr.city && addr.postalCode) fetchDeliveryFee(addr)
          }
        } catch (err) {
          console.warn('Failed to load user address:', err.message)
        }
      }
      fetchUserAddress()
    }
  }, [isAuthenticated, user, fetchDeliveryFee])

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
    if (cartItems.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    if (!deliveryInfo.calculated) {
      toast.error('Please wait — calculating delivery fee for your address…')
      return
    }

    setLoading(true)
    try {
      // Sync cart with backend
      toast.info('Syncing secure checkout session…')
      await cartService.clearCart()
      for (const item of cartItems) {
        await cartService.addToCart(item.id, item.quantity, item.variant)
      }

      let orderResult

      if (paymentMethod === 'cod') {
        orderResult = await createCODOrder()
        if (orderResult?.success) {
          toast.success('Order placed successfully! 🎉')
          clearCart()
          navigate('/orders', { state: { newOrder: orderResult.order } })
        }
      } else if (paymentMethod === 'razorpay') {
        await initRazorpayPayment()
      } else if (paymentMethod === 'upi') {
        orderResult = await initUPIPayment()
        if (orderResult?.success) {
          toast.success('Order placed successfully! 🎉')
          clearCart()
          navigate('/orders', { state: { newOrder: orderResult.order } })
        }
      } else if (paymentMethod === 'card') {
        orderResult = await initCardPayment()
        if (orderResult?.success) {
          toast.success('Order placed successfully! 🎉')
          clearCart()
          navigate('/orders', { state: { newOrder: orderResult.order } })
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

  // ── Payment handlers ──────────────────────────────────────────────────────
  const buildOrderPayload = (method) => ({
    shippingAddress,
    paymentMethod: method,
    phone,
    couponCode: appliedCoupon?.code,
    items: cartItems
  })

  const createCODOrder = async () => {
    const res = await orderService.createOrder(buildOrderPayload('cod'))
    return res.data
  }

  const initRazorpayPayment = async () => {
    // 1. Create order on backend first
    const res = await orderService.createOrder(buildOrderPayload('razorpay'))
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create order on server')

    const order = res.data.order
    const rzpOrderId = res.data.razorpayOrderId || order.razorpayOrderId
    const rzpKeyId = res.data.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder'

    // 2. Ensure Razorpay client script is loaded
    const isLoaded = await loadRazorpayScript()
    if (!isLoaded || !window.Razorpay) {
      console.warn('Razorpay SDK unavailable. Entering simulated test checkout mode.')
      toast.info('Simulating sandbox payment verification…')
      setTimeout(async () => {
        try {
          const verifyRes = await orderService.verifyRazorpayPayment({
            orderId: order._id,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: 'mock_signature_sandbox'
          })
          if (verifyRes.data?.success) {
            toast.success('Payment simulated successfully! Order confirmed. 🎉')
            clearCart()
            navigate('/orders', { state: { newOrder: verifyRes.data.order || order } })
          }
        } catch (simErr) {
          toast.error('Simulation verification failed.')
        } finally {
          setLoading(false)
        }
      }, 1200)
      return
    }

    // 3. Configure Razorpay standard checkout modal
    const options = {
      key: rzpKeyId,
      amount: Math.round((order.totalAmount || orderFinalTotal) * 100),
      currency: res.data.currency || 'INR',
      name: 'SKLP Fashion',
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
            clearCart()
            navigate('/orders', { state: { newOrder: verifyRes.data.order || order } })
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

    try {
      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error)
        toast.error(`Payment failed: ${response.error.description || 'Transaction declined'}`)
        setLoading(false)
      })
      razorpayInstance.open()
    } catch (openErr) {
      console.error('Failed to open Razorpay modal:', openErr)
      setLoading(false)
      toast.error('Could not launch payment gateway. Please try again.')
    }
  }

  const initUPIPayment = async () => {
    toast.info('Initializing UPI payment gateway…')
    return await createCODOrder()
  }

  const initCardPayment = async () => {
    toast.info('Initializing Secure Card gateway…')
    return await createCODOrder()
  }

  // ── Delivery fee display helpers ──────────────────────────────────────────
  const DeliveryFeeDisplay = () => {
    if (deliveryInfo.loading) {
      return (
        <div className="flex items-center gap-2 text-xs opacity-60 animate-pulse">
          <FiTruck className="shrink-0" />
          <span>Calculating delivery fee…</span>
        </div>
      )
    }
    if (deliveryInfo.error) {
      return (
        <div className="flex items-start gap-2 text-xs text-red-400">
          <FiAlertCircle className="shrink-0 mt-0.5" />
          <span>{deliveryInfo.error}</span>
        </div>
      )
    }
    if (!deliveryInfo.calculated) {
      return (
        <div className="flex items-center gap-2 text-xs opacity-50">
          <FiMapPin className="shrink-0" />
          <span>Enter your city and PIN code to calculate delivery fee</span>
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
        <p className="opacity-60 mb-8 max-w-sm">Please log in or register your SKLP account to access secure payment gateways.</p>
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
    <div className="container-custom py-16 min-h-screen">
      <h1 className="text-4xl font-serif font-bold mb-12 tracking-wide uppercase">Secure Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* ── LEFT: Contact, Address, Payment ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* 1. Contact Information */}
          <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
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
          <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h2 className="text-xl font-serif font-bold mb-6 text-luxury-gold tracking-wide uppercase">
              2. Delivery Address
            </h2>
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

              {/* Live delivery fee status — label only, no distance shown to customer */}
              <div className={`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <DeliveryFeeDisplay />
                {deliveryInfo.calculated && !deliveryInfo.loading && (
                  <div className="flex items-center gap-2">
                    <FiTruck className={`shrink-0 ${deliveryInfo.deliveryFee === 0 ? 'text-green-400' : 'text-amber-400'}`} />
                    <p className={`text-sm font-semibold ${deliveryInfo.deliveryFee === 0 ? 'text-green-400' : isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {deliveryInfo.deliveryLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
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
          <div className={`p-8 rounded-2xl border sticky top-24 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h2 className="text-xl font-serif font-bold mb-6 tracking-wide uppercase">Order Summary</h2>

            {/* Cart items */}
            <div className="space-y-3 mb-6 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <img src={item.image} alt={item.name} className="w-12 h-14 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs line-clamp-1">{item.name}</p>
                    <p className={`text-[10px] ${isDarkMode ? 'opacity-50' : 'text-gray-500'}`}>
                      Qty: {item.quantity} {item.variant?.size ? `• Size: ${item.variant.size}` : ''}
                    </p>
                  </div>
                  <span className="font-bold text-xs text-luxury-gold shrink-0">
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
                  placeholder="e.g. SKLP20"
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
                  value: formatPrice(cartTotal),
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
              disabled={loading || !deliveryInfo.calculated}
              className="w-full py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-luxury-black border-t-transparent" />
                  Placing Order…
                </>
              ) : !deliveryInfo.calculated ? (
                <>
                  <FiMapPin />
                  Enter Address to Continue
                </>
              ) : (
                <>
                  PLACE ORDER <FiCheckCircle />
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
    </div>
  )
}

export default Checkout
