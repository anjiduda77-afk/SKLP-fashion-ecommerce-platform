import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTruck, FiCornerUpLeft, FiXCircle, FiChevronDown } from 'react-icons/fi'
import { orderService } from '@services/apiServices'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'

function Orders() {
  const { isDarkMode } = useTheme()
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showCancelAnimation, setShowCancelAnimation] = useState(false)
  const [cancelConfirmId, setCancelConfirmId] = useState(null)

  useEffect(() => {
    if (location.state?.newOrder) {
      setShowSuccessAnimation(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  
  // Return request states
  const [returnOrderId, setReturnOrderId] = useState(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnLoading, setReturnLoading] = useState(false)

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await orderService.getOrders()
      if (res.data && res.data.orders) {
        setOrders(res.data.orders)
      }
    } catch (err) {
      console.warn('Backend API getOrders failed, using mock orders:', err.message)
      // Custom Mock Orders
      setOrders([
        {
          _id: 'mock-ord-001',
          createdAt: new Date().toISOString(),
          status: 'pending',
          paymentMethod: 'cod',
          subtotal: 8999,
          total: 8999,
          items: [
            { productId: 'f1', name: 'Premium Velvet Blazer', quantity: 1, unitPrice: 8999, finalPrice: 8999, variant: { size: 'M', color: 'Gold Black' }, images: [{ url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&q=80' }] }
          ],
          shippingAddress: { street: 'Flat 402, Golden Towers', city: 'Hyderabad', state: 'Telangana', postalCode: '500032' }
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  // Handle Cancellation
  const confirmCancelOrder = async () => {
    const orderId = cancelConfirmId
    setCancelConfirmId(null)
    try {
      const res = await orderService.cancelOrder(orderId, 'User requested cancellation')
      if (res.data && res.data.success) {
        setShowCancelAnimation(true)
        setTimeout(() => {
          setShowCancelAnimation(false)
          fetchOrders()
        }, 1000)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order.')
    }
  }

  // Handle Return Request
  const handleRequestReturn = async (e) => {
    e.preventDefault()
    if (!returnReason.trim()) {
      toast.error('Please provide a valid reason for return.')
      return
    }
    setReturnLoading(true)
    try {
      const res = await orderService.requestReturn(returnOrderId, [], returnReason)
      if (res.data && res.data.success) {
        toast.success('Return requested successfully! We will coordinate collection.')
        setReturnOrderId(null)
        setReturnReason('')
        fetchOrders()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request return.')
    } finally {
      setReturnLoading(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'shipped': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
      case 'delivered': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'return_requested': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container-custom py-24 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <h1 className="text-3xl font-serif font-bold mb-6">Track Your Orders</h1>
        <p className="opacity-60 mb-8 max-w-sm">Sign in to your account to view order history, track packages, and manage returns.</p>
        <Link
          to="/login?redirect=/orders"
          className="px-8 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-colors"
        >
          LOG IN TO TRACK ORDERS
        </Link>
      </div>
    )
  }

  return (
    <div className="container-custom py-16 min-h-screen">
      <h1 className="text-4xl font-serif font-bold mb-12 tracking-wide uppercase">My Orders</h1>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-luxury-gold mx-auto mb-4" />
          <p className="opacity-60 text-sm">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 card rounded-2xl border border-white/5">
          <p className="text-lg opacity-60 mb-8">You haven't placed any premium orders yet.</p>
          <Link
            to="/products"
            className="px-8 py-4 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400"
          >
            START SHOPPING
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order._id
            return (
              <div
                key={order._id}
                className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'border-luxury-gold/30 bg-luxury-gold/5 shadow-lg' : 'border-white/5 bg-luxury-charcoal/30'
                }`}
              >
                {/* Header overview */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                  className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-mono font-bold tracking-wider text-luxury-gold">#{order._id.toString().toUpperCase()}</span>
                      <span className={`text-[10px] px-3 py-1 border rounded-full uppercase font-semibold ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs opacity-60 font-mono">Placed on: {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div>
                      <p className="text-xs opacity-60">Grand Total</p>
                      <p className="text-lg font-bold text-luxury-gold font-mono">₹{(order.total || order.totalAmount || 0).toLocaleString()}</p>
                    </div>
                    <FiChevronDown className={`text-luxury-gold transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="p-6 space-y-6">
                        {/* Products list */}
                        <div className="space-y-4">
                          <h4 className="text-xs uppercase tracking-wider text-luxury-gold font-bold">Items Purchased</h4>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-center bg-luxury-charcoal/50 p-4 border border-white/5 rounded-xl">
                              <img src={item.images?.[0]?.url || item.image} alt={item.name} className="w-12 h-16 object-cover rounded" />
                              <div className="flex-1">
                                <h5 className="font-bold text-sm">{item.name}</h5>
                                <p className="text-[10px] opacity-60">Qty: {item.quantity} | Size: {item.variant?.size || 'Default'} | Color: {item.variant?.color || 'Default'}</p>
                              </div>
                              <span className="font-bold font-mono text-sm text-luxury-gold">₹{(item.finalPrice || (item.unitPrice * item.quantity)).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        {/* Ship address and actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-luxury-gold font-bold mb-2">Shipping Destination</h4>
                            <p className="text-xs opacity-75 leading-relaxed">
                              {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 justify-end">
                            {/* Tracking Link */}
                            {order.status !== 'cancelled' && (
                              <Link
                                to={`/orders/${order._id}/track`}
                                className="py-3 px-6 bg-luxury-gold text-luxury-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-400 transition-colors text-center flex items-center justify-center gap-2"
                              >
                                <FiTruck /> Live Ship Tracking
                              </Link>
                            )}

                            {/* Cancel Option */}
                            {order.status === 'pending' && (
                              <button
                                onClick={() => setCancelConfirmId(order._id)}
                                className="py-3 px-6 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2"
                              >
                                <FiXCircle /> Cancel Order
                              </button>
                            )}

                            {/* Return Option */}
                            {order.status === 'delivered' && (
                              <button
                                onClick={() => setReturnOrderId(order._id)}
                                className="py-3 px-6 border border-orange-500/30 text-orange-500 text-xs font-bold uppercase tracking-wider hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-2"
                              >
                                <FiCornerUpLeft /> Return Items
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* ============ RETURN REQUEST OVERLAY MODAL ============ */}
      <AnimatePresence>
        {returnOrderId && (
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
              className={`w-full max-w-md p-6 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-white/5 text-white' : 'bg-white text-black'}`}
            >
              <h3 className="text-lg font-serif font-bold mb-4">Request Return</h3>
              <form onSubmit={handleRequestReturn} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-luxury-gold block mb-1">Reason for Return</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="e.g. Size fit issues, received incorrect color variant, etc."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm focus:border-luxury-gold outline-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setReturnOrderId(null)}
                    className="flex-1 py-3 border border-white/10 text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="flex-1 py-3 bg-luxury-gold text-luxury-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-400"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="bg-luxury-charcoal border border-red-500/20 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
                <FiXCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-2">Cancel This Order?</h3>
              <p className="text-sm text-white/50 mb-8">
                This action cannot be undone. Your order will be cancelled and any payment will be refunded.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCancelConfirmId(null)}
                  className="flex-1 py-3 border border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:border-white/30 transition-colors"
                >
                  Keep Order
                </button>
                <button
                  onClick={confirmCancelOrder}
                  className="flex-1 py-3 bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-red-600 transition-colors"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md text-white p-6"
          >
            {/* Golden pulsing ring and checkmark */}
            <motion.div
              initial={{ scale: 0.5, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              className="relative w-32 h-32 flex items-center justify-center mb-8"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-4 border-luxury-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.4)]"
              />
              <svg
                className="w-16 h-16 text-luxury-gold"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                viewBox="0 0 24 24"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            {/* Confetti particles */}
            {[...Array(24)].map((_, i) => {
              const angle = (i * 360) / 24;
              const radius = 120 + Math.random() * 60;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              const colors = ['#D4AF37', '#FFF', '#C0C0C0', '#AA7C11'];
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x,
                    y,
                    scale: [0, 1.2, 0.8, 0],
                    opacity: [1, 1, 0.8, 0],
                    rotate: Math.random() * 360
                  }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
              );
            })}

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-serif font-bold tracking-wide mb-3 text-luxury-gold uppercase text-center"
            >
              Order Placed Successfully!
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="opacity-70 text-sm max-w-sm text-center mb-8 font-light"
            >
              Your premium fashion wardrobe is now being prepared. You can track its status below.
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => setShowSuccessAnimation(false)}
              className="px-8 py-3 bg-luxury-gold text-luxury-black font-bold tracking-widest text-xs uppercase hover:bg-yellow-400 transition-colors rounded-lg shadow-lg"
            >
              View My Orders
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sad Breaking Cancel Animation Overlay */}
      <AnimatePresence>
        {showCancelAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-white p-6"
          >
            {/* Crack/Breaking Animation of a Box or X */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
              {/* Left Half of Broken Circle/Cross */}
              <motion.div
                initial={{ x: 0, rotate: 0 }}
                animate={{ x: -20, y: 15, rotate: -25, opacity: [1, 1, 0] }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute"
              >
                <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" strokeWidth="6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </motion.div>
              
              {/* Right Half of Broken Circle/Cross */}
              <motion.div
                initial={{ x: 0, rotate: 0 }}
                animate={{ x: 20, y: 25, rotate: 20, opacity: [1, 1, 0] }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute"
              >
                <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" strokeWidth="6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </motion.div>
            </div>

            <motion.h2
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-serif font-bold tracking-widest text-red-500 uppercase text-center"
            >
              Order Cancelled
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-xs font-light mt-2"
            >
              We're sorry to see this item go.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Orders
