import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTruck, FiCornerUpLeft, FiXCircle, FiChevronDown } from 'react-icons/fi'
import { orderService } from '@services/apiServices'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'

function Orders() {
  const { isDarkMode } = useTheme()
  const { isAuthenticated } = useAuth()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  
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
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    try {
      const res = await orderService.cancelOrder(orderId, 'User requested cancellation')
      if (res.data && res.data.success) {
        toast.success('Order cancelled successfully!')
        fetchOrders()
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
                                onClick={() => handleCancelOrder(order._id)}
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
    </div>
  )
}

export default Orders
