import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'
import { useCart } from '@context/CartContext'
import { useAuth } from '@context/AuthContext'
import { cartService, orderService, userService } from '@services/apiServices'
import { toast } from 'react-toastify'

function Checkout() {
  const navigate = useNavigate()
  const { cartItems, cartTotal, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()

  const [loading, setLoading] = useState(false)
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
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      toast.error('Please complete all shipping address fields.')
      return
    }
    if (!phone) {
      toast.error('Please provide a contact phone number.')
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

      // 2. Submit order creation request
      const orderData = {
        shippingAddress,
        paymentMethod,
        phone
      }

      const res = await orderService.createOrder(orderData)
      if (res.data && res.data.success) {
        toast.success('Order placed successfully!')
        clearCart()
        // Navigate to Order success page with order details
        navigate('/orders', { state: { newOrder: res.data.order } })
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to place order. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate final charges
  const freeShippingThreshold = 1999
  const shippingCharges = cartTotal >= freeShippingThreshold ? 0 : 150
  const orderFinalTotal = cartTotal + shippingCharges

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
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'cod' ? 'border-luxury-gold bg-luxury-gold/5' : 'border-white/10 hover:border-white/30'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mr-4 text-luxury-gold focus:ring-luxury-gold"
                />
                <div>
                  <p className="font-bold text-sm">Cash on Delivery (COD)</p>
                  <p className="text-xs opacity-60">Pay with cash upon secure package delivery.</p>
                </div>
              </label>

              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'card' ? 'border-luxury-gold bg-luxury-gold/5' : 'border-white/10 hover:border-white/30'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mr-4 text-luxury-gold focus:ring-luxury-gold"
                />
                <div>
                  <p className="font-bold text-sm">Credit / Debit Card</p>
                  <p className="text-xs opacity-60">Visa, Mastercard, RuPay cards supported via secure link.</p>
                </div>
              </label>

              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'upi' ? 'border-luxury-gold bg-luxury-gold/5' : 'border-white/10 hover:border-white/30'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                  className="mr-4 text-luxury-gold focus:ring-luxury-gold"
                />
                <div>
                  <p className="font-bold text-sm">UPI Payment (GPay, PhonePe, Paytm)</p>
                  <p className="text-xs opacity-60">Instant payment verification using standard mobile applications.</p>
                </div>
              </label>
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

            <div className="space-y-4 mb-6 pb-6 border-b border-white/10">
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Subtotal</span>
                <span className="font-semibold">₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Insured Shipping</span>
                <span>{shippingCharges === 0 ? 'FREE' : '₹' + shippingCharges.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline mb-8">
              <span className="text-sm font-bold">Total Amount</span>
              <span className="text-2xl font-bold text-luxury-gold">₹{orderFinalTotal.toLocaleString()}</span>
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
