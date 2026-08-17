import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { 
  FiCheckCircle, FiAlertCircle, FiClock, FiUploadCloud, 
  FiBriefcase, FiShoppingBag, FiDollarSign, FiShield, 
  FiArrowRight, FiArrowLeft, FiCheck, FiX, FiFileText
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { sellerApplicationService, uploadService } from '@services/apiServices'

function BecomeSeller() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { isDarkMode } = useTheme()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [appStatus, setAppStatus] = useState(null)

  // Shop Name Availability State
  const [shopName, setShopName] = useState('')
  const [checkingShopName, setCheckingShopName] = useState(false)
  const [shopNameResult, setShopNameResult] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    applicantName: '',
    email: '',
    phone: '',
    businessType: 'individual',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    panNumber: '',
    gstNumber: '',
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    documents: []
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/become-a-seller')
      return
    }

    if (user) {
      setFormData(prev => ({
        ...prev,
        applicantName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.applicantName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone
      }))
    }

    fetchStatus()
  }, [isAuthenticated, user, navigate])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await sellerApplicationService.getStatus()
      if (res.data?.success) {
        setAppStatus(res.data)
        if (res.data.isApprovedSeller) {
          toast.success('Your seller account is already approved!')
        }
      }
    } catch (err) {
      console.warn('Could not fetch application status:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Live Shop Name Availability Check
  const handleCheckShopName = async (name) => {
    setShopName(name)
    setShopNameResult(null)
    if (!name || name.trim().length < 3) return

    setCheckingShopName(true)
    try {
      const res = await sellerApplicationService.checkShopName(name.trim())
      setShopNameResult(res.data)
    } catch (err) {
      setShopNameResult({
        available: false,
        reason: err.response?.data?.message || 'Error checking shop name.'
      })
    } finally {
      setCheckingShopName(false)
    }
  }

  // Document Upload
  const handleDocUpload = async (e, docType) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Document file size must be less than 5MB')
      return
    }

    try {
      toast.info(`Uploading ${docType.replace('_', ' ')}...`)
      const res = await uploadService.uploadImages([file])
      if (res.data?.success && res.data.images?.[0]) {
        const uploaded = res.data.images[0]
        setFormData(prev => ({
          ...prev,
          documents: [
            ...prev.documents.filter(d => d.docType !== docType),
            {
              docType,
              fileUrl: uploaded.url,
              publicId: uploaded.publicId,
              status: 'PENDING'
            }
          ]
        }))
        toast.success('Document uploaded successfully!')
      }
    } catch (err) {
      toast.error('Failed to upload document.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!shopNameResult?.available) {
      toast.error('Please choose a valid and available shop name')
      setStep(1)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        applicantName: formData.applicantName,
        email: formData.email,
        phone: formData.phone,
        shopName: shopName.trim(),
        businessType: formData.businessType,
        businessAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: 'India'
        },
        panNumber: formData.panNumber,
        gstNumber: formData.gstNumber,
        bankDetails: {
          accountName: formData.accountName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          bankName: formData.bankName
        },
        documents: formData.documents
      }

      const res = await sellerApplicationService.submitApplication(payload)
      if (res.data?.success) {
        toast.success('Application submitted successfully! 🚀')
        fetchStatus()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit seller application')
    } finally {
      setSubmitting(false)
    }
  }

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-gray-50 border-gray-300 text-gray-900'

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // ── Existing Application Status Screen ────────────────────────────────────
  if (appStatus?.hasApplication && appStatus.application?.status !== 'DRAFT') {
    const app = appStatus.application
    const isApproved = app.status === 'APPROVED' || appStatus.isApprovedSeller

    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className={`rounded-3xl border p-8 space-y-6 text-center ${cardBg} shadow-2xl animate-fade-in`}>
          {isApproved ? (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500/30 text-green-500 rounded-full flex items-center justify-center mx-auto text-4xl">
                <FiCheckCircle />
              </div>
              <h2 className={`text-3xl font-serif font-bold ${textPrimary}`}>
                Welcome to SKLP Merchant Portal! 🎉
              </h2>
              <p className={`text-base max-w-lg mx-auto ${textSecondary}`}>
                Your seller application for <strong className="text-luxury-gold">{app.shopName}</strong> has been approved! Your <span className="text-green-500 font-bold">30-Day Free Trial</span> is active.
              </p>
              <div className="pt-4 flex justify-center gap-4">
                <Link
                  to="/seller/dashboard"
                  className="px-8 py-3.5 bg-luxury-gold text-black font-bold rounded-2xl hover:bg-yellow-400 shadow-lg shadow-luxury-gold/20 transition-all flex items-center gap-2"
                >
                  <FiShoppingBag /> Go to Seller Dashboard
                </Link>
                <Link
                  to={`/shop/${appStatus.seller?.shopSlug || ''}`}
                  className={`px-6 py-3.5 border rounded-2xl font-bold transition-all ${isDarkMode ? 'border-luxury-darkGray text-white hover:bg-white/5' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}
                >
                  View Public Shop Page
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-500 rounded-full flex items-center justify-center mx-auto text-4xl">
                <FiClock />
              </div>
              <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>
                Application Status: {app.status.replace('_', ' ')}
              </h2>
              <p className={`text-sm max-w-md mx-auto ${textSecondary}`}>
                Your application for <strong className="text-luxury-gold">{app.shopName}</strong> is currently being reviewed by our compliance team.
              </p>
              {app.adminNotes && (
                <div className={`p-4 rounded-xl text-left border ${isDarkMode ? 'bg-luxury-black/50 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs font-bold text-luxury-gold uppercase tracking-wider mb-1">Compliance Notes:</p>
                  <p className={`text-sm ${textPrimary}`}>{app.adminNotes}</p>
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={() => setAppStatus(null)}
                  className="text-xs text-luxury-gold font-semibold underline hover:text-yellow-400"
                >
                  Edit or Resubmit Application
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header Banner */}
      <div className="text-center space-y-3 mb-10">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/30">
          <FiBriefcase size={13} /> SKLP Multi-Seller Marketplace
        </span>
        <h1 className={`text-4xl font-serif font-bold ${textPrimary}`}>
          Sell Your Fashion Brand on SKLP
        </h1>
        <p className={`text-sm max-w-xl mx-auto ${textSecondary}`}>
          Join India's premier fashion marketplace. Enjoy a <strong className="text-luxury-gold">30-day Free Trial</strong>, transparent 5% platform commission, and direct 7-day settlements.
        </p>
      </div>

      {/* Wizard Steps Navigation */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {['1. Business & Shop Name', '2. KYC & Verification', '3. Bank & Payouts'].map((s, idx) => {
          const stepNum = idx + 1
          const isActive = step === stepNum
          const isDone = step > stepNum
          return (
            <button
              key={s}
              onClick={() => setStep(stepNum)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                isActive
                  ? 'bg-luxury-gold text-black border-luxury-gold shadow-md'
                  : isDone
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-luxury-mediumGray' : 'bg-gray-100 border-gray-200 text-gray-500'
              }`}
            >
              {isDone ? <FiCheck size={13} /> : null}
              {s}
            </button>
          )
        })}
      </div>

      {/* Main Form Box */}
      <div className={`rounded-3xl border p-8 ${cardBg} shadow-2xl animate-fade-in`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Business & Shop Name */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-white/10">
                <h3 className={`text-lg font-bold ${textPrimary}`}>1. Business Details & Shop Name</h3>
                <p className={`text-xs ${textSecondary}`}>Choose your public shop brand name and contact details.</p>
              </div>

              {/* Shop Name with Live Validation */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                  Professional Shop Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => handleCheckShopName(e.target.value)}
                    placeholder="e.g. Urban Wear, Style Hub, Anji Fashion"
                    className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${inputBg}`}
                  />
                  {checkingShopName && (
                    <span className="absolute right-3 top-3.5 text-xs text-luxury-gold animate-pulse">Checking…</span>
                  )}
                </div>

                {shopNameResult && (
                  <p className={`text-xs font-semibold flex items-center gap-1.5 ${shopNameResult.available ? 'text-green-500' : 'text-red-500'}`}>
                    {shopNameResult.available ? <FiCheckCircle /> : <FiAlertCircle />}
                    {shopNameResult.reason}
                  </p>
                )}
                <p className="text-[11px] text-luxury-mediumGray">
                  Your public shop URL will be: <strong className="text-luxury-gold">sklp.com/shop/{shopNameResult?.slug || 'your-shop-name'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Applicant Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Business Entity Type</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm capitalize ${inputBg}`}
                  >
                    <option value="individual">Individual / Proprietor</option>
                    <option value="proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership Firm</option>
                    <option value="pvt_ltd">Private Limited (Pvt Ltd)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Street Address</label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!shopName || !formData.applicantName || !formData.phone) {
                      toast.error('Please fill required fields')
                      return
                    }
                    setStep(2)
                  }}
                  className="px-6 py-2.5 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-1.5"
                >
                  Continue to KYC <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: KYC & Document Upload */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-white/10">
                <h3 className={`text-lg font-bold ${textPrimary}`}>2. Identity & KYC Verification</h3>
                <p className={`text-xs ${textSecondary}`}>Upload your documents for safe marketplace onboarding.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>PAN Card Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm uppercase ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>GSTIN (Optional for small sellers)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm uppercase ${inputBg}`}
                  />
                </div>
              </div>

              {/* Document Upload Zones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {[
                  { id: 'govt_id', label: 'Government ID / Aadhaar' },
                  { id: 'pan_card', label: 'PAN Card Copy' },
                  { id: 'bank_proof', label: 'Bank Account Proof / Cheque' },
                  { id: 'gst_certificate', label: 'GST Certificate (If applicable)' }
                ].map(doc => {
                  const isUploaded = formData.documents.some(d => d.docType === doc.id)
                  return (
                    <div key={doc.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'border-luxury-darkGray bg-luxury-black/40' : 'border-gray-200 bg-gray-50'} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${textPrimary}`}>{doc.label}</span>
                        {isUploaded && <span className="text-xs text-green-500 font-bold flex items-center gap-1"><FiCheck /> Uploaded</span>}
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleDocUpload(e, doc.id)}
                        className="text-xs file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-luxury-gold file:text-black file:font-bold file:text-xs"
                      />
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'border-luxury-darkGray text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.panNumber) {
                      toast.error('PAN Number is required')
                      return
                    }
                    setStep(3)
                  }}
                  className="px-6 py-2.5 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-1.5"
                >
                  Continue to Bank Details <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Bank Details & Submission */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="border-b pb-3 border-white/10">
                <h3 className={`text-lg font-bold ${textPrimary}`}>3. Payout Bank Account Details</h3>
                <p className={`text-xs ${textSecondary}`}>Your 7-day post-delivery settlement payouts will be deposited here.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Bank Account Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>IFSC Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm uppercase ${inputBg}`}
                  />
                </div>
              </div>

              {/* Commission & Terms Notice */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-luxury-gold/5 border-luxury-gold/20' : 'bg-yellow-50 border-yellow-200'} space-y-2`}>
                <div className="flex items-center gap-2 text-luxury-gold font-bold text-xs">
                  <FiShield /> SKLP Merchant Terms & 30-Day Free Trial
                </div>
                <ul className="text-[11px] space-y-1 text-luxury-mediumGray list-disc pl-4">
                  <li>Upon approval, your store receives a <strong className="text-luxury-gold">30-day Free Trial</strong>.</li>
                  <li>Standard platform order commission is strictly <strong>5%</strong> of eligible sales.</li>
                  <li>Seller settlement hold is 7 days after confirmed customer delivery.</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'border-luxury-darkGray text-white' : 'border-gray-300 text-gray-700'}`}
                >
                  <FiArrowLeft className="inline mr-1" /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 shadow-lg shadow-luxury-gold/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Application 🚀'}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  )
}

export default BecomeSeller
