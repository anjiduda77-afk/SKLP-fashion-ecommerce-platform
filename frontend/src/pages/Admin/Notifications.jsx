import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@context/ThemeContext'
import {
  FiBell, FiSend, FiTrash2, FiSearch, FiRefreshCw,
  FiCheckCircle, FiSmartphone, FiPlus, FiX,
  FiFilter, FiExternalLink, FiClock, FiAlertCircle
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'
import { notificationService } from '../../services/apiServices'

const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'offer', label: 'Promotional / Offer' },
  { value: 'system', label: 'System Notice' },
  { value: 'order', label: 'Order Update' },
  { value: 'shipment', label: 'Shipment Alert' },
  { value: 'account', label: 'Account Security' },
  { value: 'seller_approved', label: 'Seller Verification' }
]

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users (Global)', desc: 'Broadcast to everyone registered' },
  { value: 'customers', label: 'Customers Only', desc: 'Target verified customer accounts' },
  { value: 'sellers', label: 'Sellers Only', desc: 'Target boutique sellers' },
  { value: 'delivery', label: 'Delivery Fleet', desc: 'Target logistics & delivery agents' }
]

function BroadcastModal({ isOpen, onClose, onSuccess }) {
  const { isDarkMode } = useTheme()
  const [targetAudience, setTargetAudience] = useState('all')
  const [type, setType] = useState('offer')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [actionUrl, setActionUrl] = useState('/products')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        targetRole: targetAudience === 'all' ? undefined : targetAudience,
        type,
        title: title.trim(),
        message: message.trim(),
        actionUrl: actionUrl.trim() || '/',
        imageUrl: imageUrl.trim() || null
      }

      const res = await adminService.createNotification(payload)
      if (res.data?.success) {
        toast.success(res.data.message || 'Notification broadcasted successfully!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.data?.message || 'Failed to dispatch broadcast')
      }
    } catch (err) {
      console.error('Broadcast error:', err)
      toast.error(err.response?.data?.message || 'Error broadcasting notification')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = `w-full border text-sm p-3 rounded-xl transition-all focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold outline-none ${
    isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  }`
  const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${
    isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-600'
  }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${
          isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-luxury-gold/20 text-luxury-gold flex items-center justify-center">
              <FiSend size={18} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg leading-tight">Broadcast Notification</h2>
              <p className="text-xs text-luxury-gold font-medium">In-App Alert + Instant Push Alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Audience */}
          <div>
            <label className={labelCls}>Target Audience</label>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTargetAudience(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    targetAudience === opt.value
                      ? 'border-luxury-gold bg-luxury-gold/15 text-luxury-gold font-bold shadow-sm'
                      : isDarkMode
                      ? 'border-luxury-darkGray bg-luxury-black/40 text-gray-300 hover:border-gray-500'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Type */}
          <div>
            <label className={labelCls}>Notification Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputCls}
            >
              <option value="offer">Promotional / Special Offer</option>
              <option value="system">System Announcement</option>
              <option value="order">Order Update</option>
              <option value="shipment">Shipping Notification</option>
              <option value="account">Account Alert</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>Alert Title</label>
              <span className="text-[10px] opacity-60 font-mono">{title.length}/60</span>
            </div>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g. VIP Festive Collection 2026 Live"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>Alert Message</label>
              <span className="text-[10px] opacity-60 font-mono">{message.length}/250</span>
            </div>
            <textarea
              required
              rows={3}
              maxLength={250}
              placeholder="e.g. Explore our newly released couture collection with early VIP access and custom fitting..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Action Link & Banner Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Target URL (Action on Click)</label>
              <input
                type="text"
                placeholder="/products or /orders"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Banner / Image URL (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Preview Box */}
          <div className={`p-3 rounded-xl border text-left ${isDarkMode ? 'bg-luxury-black/60 border-luxury-darkGray' : 'bg-gray-100 border-gray-300'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold mb-1">Live Notification Preview</p>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-luxury-gold/20 text-luxury-gold flex items-center justify-center shrink-0 mt-0.5">
                <FiBell size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-luxury-gold truncate">{title || 'Sample Alert Title'}</p>
                <p className="text-[11px] opacity-80 line-clamp-2 mt-0.5 leading-relaxed">{message || 'Your message preview will appear here in real-time as you type...'}</p>
                <span className="text-[9px] opacity-50 block mt-1 font-mono">{actionUrl || '/'}</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-inherit">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-luxury-gold text-luxury-black font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FiSend size={16} />
              {submitting ? 'Broadcasting...' : 'Send Broadcast Now'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function AdminNotifications() {
  const { isDarkMode } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({
    totalCount: 0,
    unreadCount: 0,
    pushReadyUsers: 0,
    types: []
  })
  const [loading, setLoading] = useState(true)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        adminService.getNotifications({
          page,
          limit: 20,
          type: selectedType === 'all' ? undefined : selectedType,
          search: search.trim() || undefined
        }),
        adminService.getNotificationStats()
      ])

      if (listRes.data?.success) {
        setNotifications(listRes.data.notifications || [])
        if (listRes.data.pagination) setPagination(listRes.data.pagination)
      }

      if (statsRes.data?.success && statsRes.data.stats) {
        setStats(statsRes.data.stats)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
      toast.error('Failed to load notifications list')
    } finally {
      setLoading(false)
    }
  }, [page, selectedType, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification record?')) return
    try {
      await adminService.deleteNotification(id)
      toast.success('Notification removed')
      setNotifications(prev => prev.filter(n => n._id !== id))
      setStats(prev => ({ ...prev, totalCount: Math.max(0, prev.totalCount - 1) }))
    } catch (err) {
      toast.error('Could not delete notification')
    }
  }

  const handleTestMyPush = async () => {
    try {
      await notificationService.sendTestNotification()
      toast.success('Test alert delivered! Check your browser and bell icon.')
      loadData()
    } catch (err) {
      toast.error('Could not send test notification: ' + (err.response?.data?.message || err.message))
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-luxury-gold flex items-center gap-2">
            <FiBell /> Notifications & Push Hub
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'}`}>
            Manage multi-channel broadcasts, automated order alerts, and Web Push deliveries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestMyPush}
            title="Send a sample test notification to your own admin account"
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              isDarkMode 
                ? 'border-luxury-darkGray bg-luxury-charcoal text-luxury-gold hover:bg-luxury-gold/10' 
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiSmartphone /> Test My Device
          </button>

          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-luxury-gold text-luxury-black font-bold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-glow"
          >
            <FiPlus size={16} /> New Broadcast
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-luxury-mediumGray">Total Sent</span>
            <FiBell className="text-luxury-gold" />
          </div>
          <p className="text-2xl font-bold font-serif text-luxury-gold mt-2">{stats.totalCount}</p>
          <span className="text-[10px] text-green-500 font-medium">All logged dispatches</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-luxury-mediumGray">Unread In-App</span>
            <FiAlertCircle className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-serif text-amber-500 mt-2">{stats.unreadCount}</p>
          <span className="text-[10px] opacity-70">Awaiting user interaction</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-luxury-mediumGray">Push-Ready Devices</span>
            <FiSmartphone className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-serif text-emerald-400 mt-2">{stats.pushReadyUsers}</p>
          <span className="text-[10px] text-emerald-500 font-medium">Active push subscribers</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-luxury-mediumGray">Push Channel</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-lg font-bold font-serif text-emerald-400 mt-2">Active</p>
          <span className="text-[10px] text-luxury-mediumGray">Instant Delivery Enabled</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <FiFilter className="text-luxury-gold shrink-0" />
          {NOTIFICATION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setSelectedType(t.value)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedType === t.value
                  ? 'bg-luxury-gold text-luxury-black font-bold shadow-sm'
                  : isDarkMode
                  ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search notification text..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition-all focus:ring-1 focus:ring-luxury-gold ${
              isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      {/* Notifications Table / List */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <FiRefreshCw className="animate-spin mx-auto text-luxury-gold" size={28} />
            <p className="text-xs text-luxury-mediumGray">Loading notifications ledger...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FiBell className="mx-auto text-luxury-gold/40" size={36} />
            <p className="text-sm font-semibold">No notifications found</p>
            <p className="text-xs text-luxury-mediumGray max-w-sm mx-auto">
              Broadcast announcements or trigger order notifications to populate this log.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                isDarkMode ? 'bg-luxury-black/50 border-luxury-darkGray text-luxury-mediumGray' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Notification Content</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Dispatched At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {notifications.map((n) => (
                  <tr
                    key={n._id}
                    className={`transition-colors ${
                      isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Type Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        n.type === 'offer'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : n.type === 'order' || n.type === 'shipment'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : n.type === 'seller_approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {n.type?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Recipient */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {n.userId ? (
                        <div>
                          <p className="font-semibold">{n.userId.firstName} {n.userId.lastName}</p>
                          <p className="text-[10px] opacity-60 font-mono">{n.userId.email || n.userId.phone || n.userId._id}</p>
                          <span className="text-[9px] text-luxury-gold uppercase font-semibold">{n.userId.role}</span>
                        </div>
                      ) : (
                        <span className="opacity-50">Global / Unknown</span>
                      )}
                    </td>

                    {/* Content */}
                    <td className="px-4 py-3 max-w-sm">
                      <p className="font-bold text-luxury-gold truncate">{n.title}</p>
                      <p className="text-[11px] opacity-80 line-clamp-2 leading-relaxed mt-0.5">{n.message}</p>
                      {n.actionUrl && (
                        <a
                          href={n.actionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline mt-1"
                        >
                          <FiExternalLink size={10} /> {n.actionUrl}
                        </a>
                      )}
                    </td>

                    {/* Channels */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <FiCheckCircle size={10} /> In-App
                        </span>
                        {n.channels?.push?.sent && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-luxury-gold font-medium">
                            <FiSmartphone size={10} /> Push Sent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-luxury-mediumGray">
                      <div className="flex items-center gap-1 text-[11px]">
                        <FiClock size={12} />
                        {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                      <span className="text-[10px] opacity-60">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(n._id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete notification"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-inherit text-xs">
            <span className="text-luxury-mediumGray">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-inherit disabled:opacity-30 hover:bg-white/5"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-inherit disabled:opacity-30 hover:bg-white/5"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  )
}
