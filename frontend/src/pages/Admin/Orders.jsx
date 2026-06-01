import { useState } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiSearch, FiEye, FiShoppingBag,
  FiX, FiPackage, FiTruck, FiCheckCircle, FiClock, FiXCircle
} from 'react-icons/fi'
import { toast } from 'react-toastify'

const STATUSES = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']

const STATUS_STYLES = {
  pending:    { cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: FiClock },
  processing: { cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20',   icon: FiPackage },
  shipped:    { cls: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: FiTruck },
  delivered:  { cls: 'bg-green-500/10 text-green-600 border-green-500/20', icon: FiCheckCircle },
  cancelled:  { cls: 'bg-red-500/10 text-red-600 border-red-500/20',      icon: FiXCircle },
}

const INITIAL_ORDERS = [
  { id: '#ORD-5821', customer: 'Priya Sharma', email: 'priya@email.com', phone: '98765 43210', items: [{ name: 'Silk Kurta Set', qty: 1, price: 4299 }], total: 4299, status: 'delivered', date: '2026-05-20', address: '12, MG Road, Hyderabad, TS – 500001' },
  { id: '#ORD-5820', customer: 'Rahul Mehta',  email: 'rahul@email.com', phone: '87654 32109', items: [{ name: 'Leather Sneakers', qty: 1, price: 8999 }], total: 8999, status: 'processing', date: '2026-05-22', address: '34, Banjara Hills, Hyderabad, TS – 500034' },
  { id: '#ORD-5819', customer: 'Anjali Reddy', email: 'anjali@email.com', phone: '76543 21098', items: [{ name: 'Floral Saree', qty: 1, price: 12500 }], total: 12500, status: 'shipped', date: '2026-05-21', address: '56, Jubilee Hills, Hyderabad, TS – 500033' },
  { id: '#ORD-5818', customer: 'Vikram Singh', email: 'vikram@email.com', phone: '65432 10987', items: [{ name: 'Formal Blazer', qty: 1, price: 6750 }], total: 6750, status: 'pending', date: '2026-05-23', address: '78, HITEC City, Hyderabad, TS – 500081' },
  { id: '#ORD-5817', customer: 'Meena Patel',  email: 'meena@email.com', phone: '54321 09876', items: [{ name: 'Designer Handbag', qty: 2, price: 3199 }], total: 6398, status: 'cancelled', date: '2026-05-19', address: '90, Gachibowli, Hyderabad, TS – 500032' },
  { id: '#ORD-5816', customer: 'Arjun Kumar',  email: 'arjun@email.com', phone: '43210 98765', items: [{ name: 'Silk Kurta Set', qty: 2, price: 4299 }, { name: 'Embroidered Dupatta', qty: 1, price: 1899 }], total: 10497, status: 'delivered', date: '2026-05-18', address: '23, Ameerpet, Hyderabad, TS – 500016' },
]

// ── Order Detail Slide-over ───────────────────────────────────────────────────
function OrderDetail({ order, onClose, onStatusChange }) {
  const { isDarkMode } = useTheme()
  const [status, setStatus] = useState(order.status)
  const [saving, setSaving] = useState(false)

  const handleUpdate = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    onStatusChange(order.id, status)
    toast.success(`Order ${order.id} status updated to "${status}"`)
    setSaving(false)
    onClose()
  }

  const { icon: StatusIcon, cls } = STATUS_STYLES[order.status] || {}
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
            <h3 className={`text-lg font-bold ${textPrimary}`}>{order.id}</h3>
            <p className={`text-xs ${textSecondary}`}>{order.date}</p>
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
            <p className={`font-semibold ${textPrimary}`}>{order.customer}</p>
            <p className={`text-sm ${textSecondary}`}>{order.email}</p>
            <p className={`text-sm ${textSecondary}`}>{order.phone}</p>
            <p className={`text-sm ${textSecondary}`}>{order.address}</p>
          </div>

          {/* Items */}
          <div className={`rounded-xl border p-4 ${innerBg}`}>
            <h4 className={`text-xs uppercase tracking-wider font-semibold mb-3 ${textSecondary}`}>Items Ordered</h4>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{item.name}</p>
                    <p className={`text-xs ${textSecondary}`}>Qty: {item.qty}</p>
                  </div>
                  <p className="text-sm font-bold text-luxury-gold">₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                </div>
              ))}
              <div className={`pt-3 border-t flex justify-between ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
                <span className={`text-sm font-bold ${textPrimary}`}>Total</span>
                <span className="text-sm font-bold text-luxury-gold">₹{order.total.toLocaleString('en-IN')}</span>
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
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const filtered = orders
    .filter((o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
    )
    .filter((o) => statusFilter === 'All' || o.status === statusFilter)

  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  const statusCount = (s) => orders.filter((o) => o.status === s).length

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
  const divider = isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'
  const rowHover = isDarkMode ? 'hover:bg-luxury-darkGray/20' : 'hover:bg-gray-50'

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
                const { cls } = STATUS_STYLES[order.status] || {}
                return (
                  <tr key={order.id} className={`transition-colors group ${rowHover}`}>
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-luxury-gold">{order.id}</td>
                    <td className="px-5 py-3.5">
                      <p className={`text-sm font-medium ${textPrimary}`}>{order.customer}</p>
                      <p className={`text-xs ${textSecondary}`}>{order.email}</p>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{order.items.length} item{order.items.length > 1 ? 's' : ''}</td>
                    <td className={`px-5 py-3.5 text-sm font-bold ${textPrimary}`}>₹{order.total.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${cls}`}>{order.status}</span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{order.date}</td>
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
