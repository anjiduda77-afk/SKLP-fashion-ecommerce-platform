import { useState, useEffect } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiBriefcase, FiCheckCircle, FiXCircle, FiSearch
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'

function AdminSellers() {
  const { isDarkMode } = useTheme()
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSellers()
  }, [])

  const fetchSellers = async () => {
    try {
      setLoading(true)
      const res = await adminService.getSellers()
      if (res.data.success) {
        setSellers(res.data.sellers || [])
      }
    } catch (error) {
      toast.error('Failed to load sellers')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (id, action) => {
    try {
      const res = await adminService.verifySeller(id, action, `Admin ${action} account`)
      if (res.data.success) {
        toast.success(`Seller application ${action}ed`)
        fetchSellers()
      }
    } catch (error) {
      toast.error('Failed to verify seller')
    }
  }

  const filtered = sellers.filter(s =>
    (s.storeName || `${s.firstName} ${s.lastName}` || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  )

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
        <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Seller & Vendor Verification</h2>
        <p className={`text-sm mt-0.5 ${textSecondary}`}>{sellers.length} registered merchant accounts</p>
      </div>

      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <div className="relative max-w-md">
          <FiSearch size={15} className={`absolute left-3 top-3 ${textSecondary}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seller by name, store, or email..."
            className={`w-full pl-9 py-2 border text-sm rounded-lg ${inputBg}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s._id} className={`rounded-2xl border p-5 space-y-4 ${cardBg}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center text-luxury-gold font-bold text-lg">
                  {s.storeName ? s.storeName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className={`font-bold ${textPrimary}`}>{s.storeName || `${s.firstName} ${s.lastName}`}</h3>
                  <p className={`text-xs ${textSecondary}`}>{s.email}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
                s.sellerVerificationStatus === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                s.sellerVerificationStatus === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
              }`}>
                {s.sellerVerificationStatus || 'pending'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border space-y-1 text-xs ${isDarkMode ? 'bg-luxury-black border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
              <p className={textSecondary}><span className="font-semibold">Phone:</span> {s.phone || 'N/A'}</p>
              <p className={textSecondary}><span className="font-semibold">GST / Tax ID:</span> {s.gstNumber || 'SKLP-PENDING-GST'}</p>
              <p className={textSecondary}><span className="font-semibold">Joined:</span> {new Date(s.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleVerify(s._id, 'approve')}
                disabled={s.sellerVerificationStatus === 'approved'}
                className="px-4 py-2 bg-green-500 text-white font-bold text-xs rounded-xl hover:bg-green-600 transition-all disabled:opacity-30 flex items-center gap-1.5"
              >
                <FiCheckCircle size={14} /> Approve Store
              </button>
              <button
                onClick={() => handleVerify(s._id, 'reject')}
                disabled={s.sellerVerificationStatus === 'rejected'}
                className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 font-bold text-xs rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-30 flex items-center gap-1.5"
              >
                <FiXCircle size={14} /> Reject
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className={`col-span-full rounded-2xl border p-12 text-center ${cardBg}`}>
            <FiBriefcase size={40} className="mx-auto mb-3 text-luxury-gold opacity-40" />
            <h3 className={`text-lg font-bold ${textPrimary}`}>No Sellers Found</h3>
            <p className={`text-xs mt-1 ${textSecondary}`}>No seller applications matched your search query.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSellers
