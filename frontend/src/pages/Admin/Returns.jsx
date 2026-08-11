import { useState, useEffect } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiRefreshCw, FiSearch
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'

const STATUSES = ['All', 'pending', 'approved', 'rejected', 'refunded']

function AdminReturns() {
  const { isDarkMode } = useTheme()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchReturns()
  }, [])

  const fetchReturns = async () => {
    try {
      setLoading(true)
      const res = await adminService.getReturnRequests()
      if (res.data.success) {
        setRequests(res.data.returns || [])
      }
    } catch (error) {
      toast.error('Failed to load return requests')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      const res = await adminService.updateReturnStatus(id, { status })
      if (res.data.success) {
        toast.success(`Return status updated to ${status}`)
        setRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r))
      }
    } catch (error) {
      toast.error('Failed to update return status')
    }
  }

  const filtered = requests
    .filter(r => (r.orderNumber || '').toLowerCase().includes(search.toLowerCase()) || (r.reason || '').toLowerCase().includes(search.toLowerCase()))
    .filter(r => statusFilter === 'All' || r.status === statusFilter)

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Return & Refund Requests</h2>
        <p className={`text-sm mt-0.5 ${textSecondary}`}>{requests.length} total customer return applications</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className={`flex-1 rounded-xl border p-4 ${cardBg}`}>
          <div className="relative">
            <FiSearch size={15} className={`absolute left-3 top-3 ${textSecondary}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or return reason..."
              className={`w-full pl-9 py-2 border text-sm rounded-lg ${inputBg}`}
            />
          </div>
        </div>

        <div className={`sm:w-60 rounded-xl border p-4 ${cardBg}`}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full border text-sm py-2 px-3 rounded-lg capitalize ${inputBg}`}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s} Status</option>)}
          </select>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-luxury-black/30 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
                {['Order ID', 'Reason', 'Requested On', 'Status', 'Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-left text-xs uppercase tracking-wider font-semibold ${textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-5 py-12 text-center ${textSecondary}`}>
                    <FiRefreshCw size={32} className="mx-auto mb-3 opacity-30" />
                    No return requests found.
                  </td>
                </tr>
              ) : filtered.map((req) => (
                <tr key={req._id} className="transition-colors hover:bg-white/5">
                  <td className="px-5 py-3.5 text-sm font-mono font-semibold text-luxury-gold">#{req.orderNumber || req._id.substring(18)}</td>
                  <td className={`px-5 py-3.5 text-sm max-w-xs truncate ${textPrimary}`}>{req.reason || 'Size fit issue'}</td>
                  <td className={`px-5 py-3.5 text-xs ${textSecondary}`}>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
                      req.status === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                      req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      req.status === 'refunded' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                      'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    }`}>
                      {req.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 flex gap-2">
                    <button
                      onClick={() => handleStatusChange(req._id, 'approved')}
                      disabled={req.status === 'approved'}
                      className="px-3 py-1.5 bg-green-500/10 text-green-600 border border-green-500/20 text-xs font-bold rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-30"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange(req._id, 'rejected')}
                      disabled={req.status === 'rejected'}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-30"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminReturns
