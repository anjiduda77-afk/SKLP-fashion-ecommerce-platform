import { useState, useEffect } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiTag, FiPlus, FiEdit2, FiTrash2, FiX, FiSave,
  FiPercent, FiDollarSign, FiClock
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'
import { useCurrency } from '../../context/CurrencyContext'

const EMPTY_COUPON = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minPurchaseAmount: 0,
  maxDiscountAmount: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
}

function CouponModal({ coupon, onSave, onClose }) {
  const { isDarkMode } = useTheme()
  const [form, setForm] = useState(
    coupon
      ? {
          ...coupon,
          startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
          endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : '',
        }
      : EMPTY_COUPON
  )
  const [saving, setSaving] = useState(false)

  const inputCls = `w-full border text-sm p-2.5 rounded-xl transition-colors focus:ring-1 focus:ring-luxury-gold focus:border-luxury-gold outline-none ${
    isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
  }`
  const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-600'}`

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.code || !form.discountValue) {
      toast.error('Please enter coupon code and discount value')
      return
    }

    setSaving(true)
    try {
      const data = {
        ...form,
        code: form.code.toUpperCase().trim(),
        discountValue: Number(form.discountValue),
        minPurchaseAmount: Number(form.minPurchaseAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      }
      await onSave(data, coupon?._id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl animate-fade-in ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{coupon ? 'Edit Coupon' : 'Create New Coupon'}</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Coupon Code *</label>
            <input name="code" value={form.code} onChange={handleChange} placeholder="e.g. LUXURY20" className={`${inputCls} font-mono uppercase font-bold`} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <input name="description" value={form.description} onChange={handleChange} placeholder="e.g. 20% Off Festive Sale" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Discount Type *</label>
              <select name="discountType" value={form.discountType} onChange={handleChange} className={inputCls}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Discount Value *</label>
              <input name="discountValue" type="number" value={form.discountValue} onChange={handleChange} placeholder={form.discountType === 'percentage' ? '20' : '500'} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Min Purchase (₹)</label>
              <input name="minPurchaseAmount" type="number" value={form.minPurchaseAmount} onChange={handleChange} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Discount (₹)</label>
              <input name="maxDiscountAmount" type="number" value={form.maxDiscountAmount} onChange={handleChange} placeholder="Optional" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start Date</label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div className={`flex gap-3 pt-4 border-t ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 border rounded-xl font-semibold text-sm transition-colors ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900'}`}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" /> : <FiSave size={15} />}
              {coupon ? 'Update' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminCoupons() {
  const { isDarkMode } = useTheme()
  const { formatPrice } = useCurrency()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const res = await adminService.getCoupons()
      if (res.data.success) {
        setCoupons(res.data.coupons)
      }
    } catch (error) {
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data, id) => {
    try {
      if (id) {
        const res = await adminService.updateCoupon(id, data)
        if (res.data.success) {
          toast.success('Coupon updated')
          fetchCoupons()
        }
      } else {
        const res = await adminService.createCoupon(data)
        if (res.data.success) {
          toast.success('Coupon created!')
          fetchCoupons()
        }
      }
      setShowModal(false)
      setEditingCoupon(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save coupon')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this coupon?')) return
    try {
      const res = await adminService.deleteCoupon(id)
      if (res.data.success) {
        toast.success('Coupon deactivated')
        fetchCoupons()
      }
    } catch (error) {
      toast.error('Failed to deactivate coupon')
    }
  }

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Coupon Management</h2>
          <p className={`text-sm mt-0.5 ${textSecondary}`}>{coupons.length} promotional coupons active</p>
        </div>
        <button
          onClick={() => { setEditingCoupon(null); setShowModal(true) }}
          className="flex items-center gap-2 px-5 py-2.5 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm shadow-glow"
        >
          <FiPlus size={17} /> Create Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div key={c._id} className={`rounded-2xl border p-5 space-y-4 relative overflow-hidden ${cardBg}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold">
                  {c.discountType === 'percentage' ? <FiPercent size={20} /> : <FiDollarSign size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-luxury-gold tracking-wide">{c.code}</h3>
                  <p className={`text-xs ${textSecondary}`}>{c.description || 'Promotional Discount'}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.isActive ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                {c.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border space-y-1.5 text-xs ${isDarkMode ? 'bg-luxury-black border-luxury-darkGray' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between">
                <span className={textSecondary}>Discount Value:</span>
                <span className={`font-bold ${textPrimary}`}>{c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `${formatPrice(c.discountValue)} OFF`}</span>
              </div>
              <div className="flex justify-between">
                <span className={textSecondary}>Min Purchase:</span>
                <span className={`font-semibold ${textPrimary}`}>{c.minPurchaseAmount > 0 ? formatPrice(c.minPurchaseAmount) : 'No Minimum'}</span>
              </div>
              <div className="flex justify-between">
                <span className={textSecondary}>Expires:</span>
                <span className={`font-semibold flex items-center gap-1 ${textSecondary}`}>
                  <FiClock size={11} /> {new Date(c.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => { setEditingCoupon(c); setShowModal(true) }}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900'}`}
              >
                <FiEdit2 size={13} /> Edit
              </button>
              <button
                onClick={() => handleDelete(c._id)}
                className="p-2 rounded-lg border border-red-500/30 text-red-500 text-xs font-semibold flex items-center gap-1 hover:bg-red-500/10 transition-all"
              >
                <FiTrash2 size={13} /> Deactivate
              </button>
            </div>
          </div>
        ))}

        {coupons.length === 0 && (
          <div className={`col-span-full rounded-2xl border p-12 text-center ${cardBg}`}>
            <FiTag size={40} className="mx-auto mb-3 text-luxury-gold opacity-40" />
            <h3 className={`text-lg font-bold ${textPrimary}`}>No Coupons Found</h3>
            <p className={`text-xs mt-1 ${textSecondary}`}>Click "Create Coupon" to launch your first promotional discount code.</p>
          </div>
        )}
      </div>

      {showModal && <CouponModal coupon={editingCoupon} onSave={handleSave} onClose={() => { setShowModal(false); setEditingCoupon(null) }} />}
    </div>
  )
}

export default AdminCoupons
