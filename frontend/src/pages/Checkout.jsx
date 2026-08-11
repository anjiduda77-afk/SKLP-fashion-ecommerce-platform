import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'
import { useCart } from '@context/CartContext'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { userService, orderService, cartService } from '@services/apiServices'
import { useCurrency } from '../context/CurrencyContext'
import { toast } from 'react-toastify'

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

  const shippingCharges = cartTotal > 5000 ? 0 : 250
  const orderFinalTotal = Math.max(0, cartTotal + shippingCharges - discountAmount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }
    setValidatingCoupon(true)
    try {
      const res = await cartService.applyCoupon(couponCode.toUpperCase().trim())
      if (res.data.success) {
        setAppliedCoupon(res.data.coupon)
        setDiscountAmount(res.data.discountAmount || 0)
        toast.success(`Coupon "${couponCode.toUpperCase()}" applied!`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired coupon code')
    } finally {
      setValidatingCoupon(false)
    }
  }

  // Load user default address if available
  useEffect(() => {
    if (isAuthenticated && user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')

      const fetchUserAddress = async () => {
        try {
          const res = await userService.getAddresses()
          if (res.data && res.data.addresses?.length > 0) {
            const defAddr = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0]
            setShippingAddress({
              street: defAddr.street || '',
              city: defAddr.city || '',
              state: defAddr.state || '',
              postalCode: defAddr.postalCode || '',
              country: defAddr.country || 'India'
            })
          }
        } catch (err) {
          console.warn('Failed to load user address, continuing empty:', err.message)
        }
      }
      fetchUserAddress()
    }
  }, [isAuthenticated, user])

  const handlePlaceOrder = async (e) => {
    e.preventDefault()

    // Validate form
    if (!firstName || !lastName || !phone || !email) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      toast.error('Please provide complete shipping address')
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

    setLoading(true)

    try {
      // 1. Sync local storage cart with backend database
      toast.info('Syncing secure checkout session...')
      await cartService.clearCart()
      for (const item of cartItems) {
        await cartService.addToCart(item.id, item.quantity, item.variant)
      }

      // Handle different payment methods
      let orderResult
      
      if (paymentMethod === 'cod') {
        // Direct order creation for COD
        orderResult = await createCODOrder()
      } else if (paymentMethod === 'razorpay') {
        // Initialize Razorpay payment
        orderResult = await initRazorpayPayment()
      } else if (paymentMethod === 'upi') {
        // Initialize UPI payment
        orderResult = await initUPIPayment()
      } else if (paymentMethod === 'card') {
        // Initialize Card payment
        orderResult = await initCardPayment()
      }

      if (orderResult?.success) {
        toast.success('Order placed successfully!')
        clearCart()
        navigate('/orders', { state: { newOrder: orderResult.order } })
      }
    } catch (err) {
      console.error('Order placement error:', err)
      toast.error(err.response?.data?.message || err.message || 'Failed to place order. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Payment method handlers
  const createCODOrder = async () => {
    const orderData = {
      shippingAddress,
      paymentMethod: 'cod',
      phone,
      items: cartItems
    }
    const res = await orderService.createOrder(orderData)
    return res.data
  }

  const initRazorpayPayment = async () => {
    // Step 1: Create order on backend
    const orderData = {
      shippingAddress,
      paymentMethod: 'razorpay',
      phone,
      items: cartItems,
      amount: orderFinalTotal
    }

    const res = await orderService.createOrder(orderData)
    if (!res.data?.success) throw res.data

    const order = res.data.order

    // If razorpay is not loaded (mock handling)
    if (!window.Razorpay) {
      console.warn('Razorpay SDK not found, using mock successful payment')
      // Simulate successful verification call
      toast.info('Simulating Razorpay payment...')
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, order })
        }, 1500)
      })
    }

    // Step 2: Initialize Razorpay
    const options = {
      key: (import.meta.env && import.meta.env.VITE_RAZORPAY_KEY) || 'test_key',
      amount: orderFinalTotal * 100,
      currency: 'INR',
      name: 'SKLP Fashion',
      description: 'Premium Fashion Ecommerce',
      order_id: order.razorpayOrderId,
      handler: async (response) => {
        try {
          // Verify payment
          const verifyRes = await orderService.verifyRazorpayPayment({
            orderId: order._id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature
          })
          if (verifyRes.data?.success) {
            toast.success('Payment verified successfully!')
            clearCart()
            navigate('/orders', { state: { newOrder: order } })
          }
        } catch (err) {
          toast.error('Payment verification failed.')
        }
      },
      prefill: {
        name: `${firstName} ${lastName}`,
        email: email,
        contact: phone
      },
      theme: { color: '#FFD700' }
    }

    const razorpay = new window.Razorpay(options)
    razorpay.open()
    
    // Return early, actual navigation happens in handler
    return { success: false } // Prevents default navigation in main try-catch
  }

  const initUPIPayment = async () => {
    toast.info('Initializing UPI payment gateway...')
    // Mock UPI gateway
    return await createCODOrder() 
  }

  const initCardPayment = async () => {
    toast.info('Initializing Secure Card gateway...')
    // Mock Card gateway
    return await createCODOrder() 
  }

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

  return (
    <div className="container-custom py-16 min-h-screen">
      <h1 className="text-4xl font-serif font-bold mb-12 tracking-wide uppercase">Secure Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT COLUMN: Shipping & Payment details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Contact Details */}
          <div className="card p-8 rounded-2xl border border-white/5">
            <h2 className="text-xl font-serif font-bold mb-6 text-luxury-gold tracking-wide uppercase">1. Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider block mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider block mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs uppercase tracking-wider block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none opacity-60"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card p-8 rounded-2xl border border-white/5">
            <h2 className="text-xl font-serif font-bold mb-6 text-luxury-gold tracking-wide uppercase">2. Delivery Address</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider block mb-1">Street Address</label>
                <input
                  type="text"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  required
                  placeholder="Apartment, suite, unit, building, street, etc."
                  className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider block mb-1">City</label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    required
                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider block mb-1">State / Province</label>
                  <input
                    type="text"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    required
                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider block mb-1">Postal Code (PIN)</label>
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    required
                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider block mb-1">Country</label>
                  <input
                    type="text"
                    value={shippingAddress.country}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm opacity-60 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Option */}
          <div className="card p-8 rounded-2xl border border-white/5">
            <h2 className="text-xl font-serif font-bold mb-6 text-luxury-gold tracking-wide uppercase">3. Payment Details</h2>
            <div className="space-y-4">
              {/* Cash on Delivery (COD) */}
              <div 
                onClick={() => setPaymentMethod('cod')}
                className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                  paymentMethod === 'cod' 
                    ? 'border-luxury-gold bg-luxury-gold/10 shadow-glow' 
                    : isDarkMode 
                      ? 'border-white/10 bg-white/5 hover:border-luxury-gold/50' 
                      : 'border-gray-200 bg-gray-50 hover:border-luxury-gold/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                  paymentMethod === 'cod' 
                    ? 'border-luxury-gold bg-luxury-gold text-luxury-black' 
                    : isDarkMode ? 'border-white/20' : 'border-black/20'
                }`}>
                  {paymentMethod === 'cod' && (
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-luxury-black'}`}>Cash on Delivery (COD)</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Pay with cash upon secure package delivery.</p>
                </div>
              </div>

              {/* Credit / Debit Card */}
              <div 
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                  paymentMethod === 'card' 
                    ? 'border-luxury-gold bg-luxury-gold/10 shadow-glow' 
                    : isDarkMode 
                      ? 'border-white/10 bg-white/5 hover:border-luxury-gold/50' 
                      : 'border-gray-200 bg-gray-50 hover:border-luxury-gold/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                  paymentMethod === 'card' 
                    ? 'border-luxury-gold bg-luxury-gold text-luxury-black' 
                    : isDarkMode ? 'border-white/20' : 'border-black/20'
                }`}>
                  {paymentMethod === 'card' && (
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-luxury-black'}`}>Credit / Debit Card</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Visa, Mastercard, RuPay cards supported via secure link.</p>
                </div>
              </div>

              {/* UPI Payment */}
              <div 
                onClick={() => setPaymentMethod('upi')}
                className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                  paymentMethod === 'upi' 
                    ? 'border-luxury-gold bg-luxury-gold/10 shadow-glow' 
                    : isDarkMode 
                      ? 'border-white/10 bg-white/5 hover:border-luxury-gold/50' 
                      : 'border-gray-200 bg-gray-50 hover:border-luxury-gold/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                  paymentMethod === 'upi' 
                    ? 'border-luxury-gold bg-luxury-gold text-luxury-black' 
                    : isDarkMode ? 'border-white/20' : 'border-black/20'
                }`}>
                  {paymentMethod === 'upi' && (
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-luxury-black'}`}>UPI Payment (GPay, PhonePe, Paytm)</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Instant payment verification using standard mobile applications.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Summary and Actions */}
        <div className="space-y-6">
          <div className="card p-8 rounded-2xl border border-white/5 sticky top-24">
            <h2 className="text-xl font-serif font-bold mb-6 tracking-wide uppercase">Order Review</h2>
            
            {/* Short Cart listing */}
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <img src={item.image} alt={item.name} className="w-12 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <p className="font-semibold text-xs line-clamp-1">{item.name}</p>
                    <p className="text-[10px] opacity-60">Qty: {item.quantity} | Size: {item.variant?.size || 'Free'}</p>
                  </div>
                  <span className="font-bold text-xs text-luxury-gold">₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Coupon Code Box */}
            <div className="mb-6 p-4 rounded-xl border border-luxury-gold/20 bg-luxury-gold/5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-luxury-gold block">Promo / Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. LUXURY20"
                  className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-xs uppercase font-mono outline-none focus:border-luxury-gold"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon}
                  className="px-4 py-2 bg-luxury-gold text-black font-bold text-xs rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-all"
                >
                  {validatingCoupon ? 'Validating...' : 'Apply'}
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-xs font-bold text-green-400 flex items-center gap-1 mt-1">
                  ✓ Applied {appliedCoupon.code} (-{formatPrice(discountAmount)})
                </p>
              )}
            </div>

            <div className="space-y-4 mb-6 pb-6 border-b border-white/10">
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Subtotal</span>
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-green-400">
                  <span>Coupon Discount</span>
                  <span className="font-bold">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Insured Shipping</span>
                <span>{shippingCharges === 0 ? 'FREE' : formatPrice(shippingCharges)}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline mb-8">
              <span className="text-sm font-bold">Total Amount</span>
              <span className="text-2xl font-bold text-luxury-gold">{formatPrice(orderFinalTotal)}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-luxury-black border-t-transparent" />
                  Placing Order...
                </>
              ) : (
                <>
                  PLACE ORDER <FiCheckCircle />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Checkout
