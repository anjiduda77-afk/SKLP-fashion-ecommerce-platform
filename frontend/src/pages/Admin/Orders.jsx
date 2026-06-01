import { useState, useEffect } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiSearch, FiEye, FiShoppingBag,
  FiX, FiPackage, FiTruck, FiCheckCircle, FiClock, FiXCircle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import apiServices from '../../services/apiServices'

const STATUSES = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']

const STATUS_STYLES = {
  pending:    { cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: FiClock },
  processing: { cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20',   icon: FiPackage },
  shipped:    { cls: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: FiTruck },
  delivered:  { cls: 'bg-green-500/10 text-green-600 border-green-500/20', icon: FiCheckCircle },
  cancelled:  { cls: 'bg-red-500/10 text-red-600 border-red-500/20',      icon: FiXCircle },
  refunded:   { cls: 'bg-gray-500/10 text-gray-600 border-gray-500/20',      icon: FiXCircle },
  returned:   { cls: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: FiXCircle },
}

// ── Order Detail Slide-over ───────────────────────────────────────────────────
function OrderDetail({ order, onClose, onStatusChange }) {
  const { isDarkMode } = useTheme()
  const [status, setStatus] = useState(order.status)
  const [saving, setSaving] = useState(false)

  const handleUpdate = async () => {
    try {
      setSaving(true)
      const res = await apiServices.adminService.updateOrderStatus(order._id, status)
      if (res.data.success) {
        onStatusChange(order._id, status)
        toast.success(`Order status updated to "${status}"`)
        onClose()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status')
    } finally {
      setSaving(false)
    }
  }

  const { icon: StatusIcon, cls } = STATUS_STYLES[order.status] || STATUS_STYLES.pending
  const panelBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const innerBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray' : 'bg-gray-50 border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`w-full max-w-md border-l h-full overflow-y-auto animate-slide-in flex flex-col ${panelBg}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10 ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
          <div>
            <h3 className={`text-lg font-bold ${textPrimary}`}>{order.orderNumber}</h3>
            <p className={`text-xs ${textSecondary}`}>{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}><FiX /></button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${cls}`}>
            {StatusIcon && <StatusIcon size={14} />}
            <span className="capitalize">{order.status}</span>
          </div>

          {/* Customer */}
          <div className={`rounded-xl border p-4 space-y-2 ${innerBg}`}>
            <h4 className={`text-xs uppercase tracking-wider font-semibold mb-3 ${textSecondary}`}>Customer</h4>
            <p className={`font-semibold ${textPrimary}`}>{order.userId?.firstName} {order.userId?.lastName}</p>
            <p className={`text-sm ${textSecondary}`}>{order.userId?.email}</p>
            <p className={`text-sm ${textSecondary}`}>{order.userId?.phone || 'N/A'}</p>
            <p className={`text-sm ${textSecondary}`}>
              {order.shippingAddress ? `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}` : 'Address not found'}
            </p>
          </div>

          {/* Items */}
          <div className={`rounded-xl border p-4 ${innerBg}`}>
            <h4 className={`text-xs uppercase tracking-wider font-semibold mb-3 ${textSecondary}`}>Items Ordered</h4>
            <div className="space-y-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{item.productName || 'Product'}</p>
                    <p className={`text-xs ${textSecondary}`}>Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-luxury-gold">₹{((item.finalPrice || item.price) * item.quantity).toLocaleString('en-IN')}</p>
                </div>
              ))}
              <div className={`pt-3 border-t flex justify-between ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
                <span className={`text-sm font-bold ${textPrimary}`}>Total</span>
                <span className="text-sm font-bold text-luxury-gold">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Update Status */}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <div className={`rounded-xl border p-4 ${innerBg}`}>
              <h4 className={`text-xs uppercase tracking-wider font-semibold mb-3 ${textSecondary}`}>Update Status</h4>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full border text-sm mb-3 p-2 rounded-lg ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                {STATUSES.filter(s => s !== 'All').map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
              <button
                onClick={handleUpdate}
                disabled={saving || status === order.status}
                className="w-full py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {saving ? <span className="w-4 h-4 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" /> : null}
                Update Status
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
function AdminOrders() {
  const { isDarkMode } = useTheme()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await apiServices.adminService.getOrders({ limit: 100 })
      if (res.data.success) {
        setOrders(res.data.orders)
      }
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const filtered = orders
    .filter((o) =>
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.userId?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      o.userId?.lastName?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((o) => statusFilter === 'All' || o.status === statusFilter)

  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: newStatus } : o))
    if (selectedOrder && selectedOrder._id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus })
    }
  }

  const statusCount = (s) => orders.filter((o) => o.status === s).length

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
  const divider = isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'
  const rowHover = isDarkMode ? 'hover:bg-luxury-darkGray/20' : 'hover:bg-gray-50'

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Orders</h2>
        <p className={`text-sm mt-0.5 ${textSecondary}`}>{orders.length} total orders</p>
      </div>

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const isAll = s === 'All'
          const count = isAll ? orders.length : statusCount(s)
          const isActive = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                isActive
                  ? 'bg-luxury-gold text-luxury-black border-luxury-gold'
                  : isDarkMode
                    ? 'border-luxury-darkGray text-luxury-mediumGray hover:border-luxury-mediumGray hover:text-white'
                    : 'border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-900'
              }`}
            >
              {s} <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-luxury-black/20' : isDarkMode ? 'bg-luxury-darkGray' : 'bg-gray-100'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <div className="relative max-w-sm">
          <FiSearch size={15} className={`absolute left-3 top-3 ${textSecondary}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or customer..."
            className={`w-full pl-9 py-2 border text-sm rounded-lg ${inputBg}`}
          />
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-luxury-black/30 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
                {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-left text-xs uppercase tracking-wider font-semibold ${textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-5 py-12 text-center ${textSecondary}`}>
                    <FiShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
                    No orders found
                  </td>
                </tr>
              ) : filtered.map((order) => {
                const { cls } = STATUS_STYLES[order.status] || STATUS_STYLES.pending
                return (
                  <tr key={order._id} className={`transition-colors group ${rowHover}`}>
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-luxury-gold">{order.orderNumber}</td>
                    <td className="px-5 py-3.5">
                      <p className={`text-sm font-medium ${textPrimary}`}>{order.userId?.firstName} {order.userId?.lastName}</p>
                      <p className={`text-xs ${textSecondary}`}>{order.userId?.email}</p>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</td>
                    <td className={`px-5 py-3.5 text-sm font-bold ${textPrimary}`}>₹{order.totalAmount?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${cls}`}>{order.status}</span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all opacity-0 group-hover:opacity-100 ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:border-luxury-gold hover:text-luxury-gold' : 'border-gray-300 text-gray-500 hover:border-luxury-gold hover:text-luxury-gold'}`}
                      >
                        <FiEye size={13} /> View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className={`px-5 py-3 border-t text-xs ${textSecondary} ${divider}`}>
          Showing {filtered.length} of {orders.length} orders
        </div>
      </div>

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

export default AdminOrders
