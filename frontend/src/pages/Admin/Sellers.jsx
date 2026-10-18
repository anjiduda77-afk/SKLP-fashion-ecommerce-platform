import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@context/ThemeContext'
import {
  FiBriefcase, FiCheckCircle, FiXCircle, FiSearch,
  FiClock, FiEye, FiRefreshCw, FiFileText,
  FiAlertCircle, FiSlash, FiDownload, FiX
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'

const STATUS_CONFIG = {
  PENDING_REVIEW:        { label: 'Pending Review',   category: 'PENDING',    badgeCls: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25', icon: FiClock },
  SUBMITTED:             { label: 'Submitted',         category: 'PENDING',    badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',     icon: FiFileText },
  UNDER_REVIEW:          { label: 'Under Review',      category: 'PENDING',    badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',     icon: FiEye },
  NEEDS_CORRECTION:      { label: 'Needs Correction', category: 'CORRECTION', badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  REVIEW_REQUIRED:       { label: 'Review Required',   category: 'CORRECTION', badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  REQUEST_CHANGES:       { label: 'Changes Requested', category: 'CORRECTION', badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  VERIFICATION_REQUIRED: { label: 'Verification Req.', category: 'CORRECTION', badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  APPROVED:              { label: 'Approved Store',    category: 'APPROVED',   badgeCls: 'bg-green-500/10 text-green-500 border-green-500/25',   icon: FiCheckCircle },
  REJECTED:              { label: 'Rejected',           category: 'REJECTED',   badgeCls: 'bg-red-500/10 text-red-500 border-red-500/25',       icon: FiXCircle },
  SUSPENDED:             { label: 'Suspended',          category: 'REJECTED',   badgeCls: 'bg-red-500/10 text-red-500 border-red-500/25',       icon: FiSlash },
  DRAFT:                 { label: 'Draft',              category: 'PENDING',    badgeCls: 'bg-gray-500/10 text-gray-400 border-gray-500/25',     icon: FiFileText }
}

const CATEGORY_TABS = [
  { id: 'ALL',        label: 'All Applications' },
  { id: 'PENDING',    label: 'Pending Review' },
  { id: 'CORRECTION', label: 'Needs Correction' },
  { id: 'APPROVED',   label: 'Approved Stores' },
  { id: 'REJECTED',   label: 'Rejected Applications' }
]

function ActionModal({ app, actionType, onClose, onConfirm, isDarkMode }) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cfg = {
    APPROVE: {
      title: 'Approve Seller & Activate Store',
      btnColor: 'bg-green-600 hover:bg-green-700',
      btnText: 'Approve & Activate Seller',
      required: false,
      warning: 'Promoting this user to SELLER role will activate their Seller Hub access, register their boutique store, lock their brand name, and initiate a 30-day Free Trial subscription.'
    },
    REJECT: {
      title: 'Reject Seller Application',
      btnColor: 'bg-red-600 hover:bg-red-700',
      btnText: 'Confirm Rejection',
      required: true,
      warning: 'A mandatory rejection reason must be recorded. The applicant will receive this exact explanation.'
    },
    NEEDS_CORRECTION: {
      title: 'Request Application Correction',
      btnColor: 'bg-orange-600 hover:bg-orange-700',
      btnText: 'Request Correction',
      required: true,
      warning: 'Specify the exact items requiring correction (e.g., clearer shop photographs, updated address, or valid tax documents).'
    },
    SUSPEND: {
      title: 'Suspend Seller Store',
      btnColor: 'bg-red-600 hover:bg-red-700',
      btnText: 'Suspend Store',
      required: true,
      warning: 'Suspending this seller will freeze their active listings and deactivate Seller Hub access.'
    },
    REACTIVATE: {
      title: 'Reactivate Seller Account',
      btnColor: 'bg-green-600 hover:bg-green-700',
      btnText: 'Reactivate Store',
      required: false,
      warning: 'This will restore the seller account to active status and reinstate catalog visibility.'
    }
  }[actionType] || { title: actionType, btnColor: 'bg-amber-600', btnText: 'Confirm', required: false }

  const submit = async () => {
    if (cfg.required && !notes.trim()) {
      toast.error('A reason or instructions are mandatory for this action.')
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(app._id, actionType, notes.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
        isDarkMode ? 'bg-[#18181b] border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cfg.title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <FiX size={18} />
          </button>
        </div>

        <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
          isDarkMode ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          <div className="flex justify-between">
            <span className="text-gray-500">Shop / Brand:</span>
            <span className="font-semibold text-amber-500">{app.shopName} ({app.brandName || app.shopName})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Applicant:</span>
            <span className="font-medium">{app.ownerName || app.applicantName} ({app.email})</span>
          </div>
          {app.applicationReference && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reference:</span>
              <span className="font-mono text-gray-400">{app.applicationReference}</span>
            </div>
          )}
          {cfg.warning && (
            <p className="pt-2 text-[11px] text-amber-500/90 leading-relaxed border-t border-gray-800 font-medium">
              {cfg.warning}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {cfg.required ? 'Mandatory Reason / Instructions *' : 'Internal Notes / Remarks (Optional)'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder={cfg.required ? 'Provide actionable remarks for the applicant…' : 'Enter internal compliance remarks or approval notes…'}
            className={`w-full p-3 rounded-xl border text-sm resize-none outline-none focus:ring-2 focus:ring-amber-500/30 ${
              isDarkMode ? 'bg-black/50 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className={`px-4 py-2 border rounded-xl text-xs font-semibold transition-all ${
              isDarkMode ? 'border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className={`px-5 py-2 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all ${cfg.btnColor}`}
          >
            {submitting ? 'Processing…' : cfg.btnText}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminSellers() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDarkMode } = useTheme()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'ALL')
  const [actionModal, setActionModal] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  const tp = isDarkMode ? 'text-white' : 'text-gray-900'
  const ts = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const cb = isDarkMode ? 'bg-[#18181b] border-gray-800' : 'bg-white border-gray-200'
  const ib = isDarkMode ? 'bg-black/30 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminService.getSellerApplications()
      if (res.data?.success) {
        setApplications(res.data.applications || [])
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load seller applications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const confirmAction = async (id, actionType, notes) => {
    try {
      const res = await adminService.reviewSellerApplication(id, actionType, notes, notes)
      if (res.data?.success) {
        toast.success(res.data.message || `Application ${actionType.toLowerCase()} processed successfully.`)
        setActionModal(null)
        await fetchApplications()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to process ${actionType}`)
    }
  }

  const handleDownloadAgreement = async (e, app) => {
    e.stopPropagation()
    try {
      setDownloadingId(app._id)
      toast.info(`Generating Agreement PDF for ${app.shopName}…`)
      const res = await adminService.downloadSellerAgreementPdf(app._id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const ref = app.applicationReference || app._id
      link.href = url
      link.setAttribute('download', `StyleStreet_Seller_Agreement_${ref}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Agreement PDF downloaded successfully.')
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('Failed to download agreement PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter(a => ['PENDING_REVIEW', 'SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).length,
      correction: applications.filter(a => ['NEEDS_CORRECTION', 'REQUEST_CHANGES', 'REVIEW_REQUIRED', 'VERIFICATION_REQUIRED'].includes(a.status)).length,
      approved: applications.filter(a => a.status === 'APPROVED').length,
      rejected: applications.filter(a => ['REJECTED', 'SUSPENDED'].includes(a.status)).length
    }
  }, [applications])

  // Filtered Applications by active category tab & search query
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Category Tab Filter
      if (activeTab === 'PENDING') {
        if (!['PENDING_REVIEW', 'SUBMITTED', 'UNDER_REVIEW'].includes(app.status)) return false
      } else if (activeTab === 'CORRECTION') {
        if (!['NEEDS_CORRECTION', 'REQUEST_CHANGES', 'REVIEW_REQUIRED', 'VERIFICATION_REQUIRED'].includes(app.status)) return false
      } else if (activeTab === 'APPROVED') {
        if (app.status !== 'APPROVED') return false
      } else if (activeTab === 'REJECTED') {
        if (!['REJECTED', 'SUSPENDED'].includes(app.status)) return false
      }

      // Search Query Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchShop = (app.shopName || '').toLowerCase().includes(q)
        const matchBrand = (app.brandName || '').toLowerCase().includes(q)
        const matchApplicant = (app.ownerName || app.applicantName || '').toLowerCase().includes(q)
        const matchEmail = (app.email || '').toLowerCase().includes(q)
        const matchPhone = (app.phone || '').toLowerCase().includes(q)
        const matchRef = (app.applicationReference || '').toLowerCase().includes(q)
        if (!matchShop && !matchBrand && !matchApplicant && !matchEmail && !matchPhone && !matchRef) {
          return false
        }
      }

      return true
    })
  }, [applications, activeTab, search])

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Action Modal */}
      {actionModal && (
        <ActionModal
          app={actionModal.app}
          actionType={actionModal.actionType}
          isDarkMode={isDarkMode}
          onClose={() => setActionModal(null)}
          onConfirm={confirmAction}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${tp}`}>Seller Application Management</h2>
          <p className={`text-xs mt-0.5 ${ts}`}>
            Enterprise onboarding portal. Inspect merchant particulars, verify physical store photographs, validate agreements, and execute compliance status transitions.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
            isDarkMode ? 'border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Records
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Applications', count: stats.total,      color: 'text-gray-300',   Icon: FiBriefcase },
          { label: 'Pending Review',     count: stats.pending,    color: 'text-yellow-500', Icon: FiClock },
          { label: 'Needs Correction',   count: stats.correction, color: 'text-orange-500', Icon: FiAlertCircle },
          { label: 'Approved Stores',    count: stats.approved,   color: 'text-green-500',  Icon: FiCheckCircle },
          { label: 'Rejected / Susp.',   count: stats.rejected,   color: 'text-red-500',    Icon: FiXCircle }
        ].map(item => (
          <div key={item.label} className={`rounded-2xl border p-4 shadow-sm ${cb}`}>
            <div className="flex items-center gap-2">
              <item.Icon size={16} className={item.color} />
              <span className={`text-xs font-semibold ${ts}`}>{item.label}</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${tp}`}>{item.count}</p>
          </div>
        ))}
      </div>

      {/* Search and Category Filter Tabs */}
      <div className={`rounded-2xl border p-4 space-y-4 ${cb}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_TABS.map(tab => {
              const isActive = activeTab === tab.id
              const countBadge = tab.id === 'ALL'
                ? stats.total
                : tab.id === 'PENDING'
                  ? stats.pending
                  : tab.id === 'CORRECTION'
                    ? stats.correction
                    : tab.id === 'APPROVED'
                      ? stats.approved
                      : stats.rejected

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/15'
                      : isDarkMode
                        ? 'border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/60'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-black/20 text-black' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {countBadge}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-64 max-w-md w-full">
            <FiSearch size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${ts}`} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by shop, brand, applicant, or contact…"
              className={`w-full pl-9 pr-8 py-2 border text-xs rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 ${ib}`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Applications Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${cb}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-xs uppercase tracking-wider font-semibold ${ts}`}>Loading Seller Applications…</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FiBriefcase size={38} className="mx-auto text-gray-600" />
            <h3 className={`text-base font-bold ${tp}`}>No Applications Found</h3>
            <p className={`text-xs max-w-sm mx-auto ${ts}`}>
              No seller onboarding records match your currently selected status category or search query.
            </p>
            {(activeTab !== 'ALL' || search) && (
              <button
                onClick={() => { setActiveTab('ALL'); setSearch('') }}
                className="mt-2 px-3.5 py-1.5 border border-amber-500/40 text-amber-500 rounded-xl text-xs font-semibold hover:bg-amber-500/10 transition-colors"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className={`border-b ${isDarkMode ? 'border-gray-800 bg-black/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                <tr>
                  <th className="py-3 px-4 font-semibold">Shop / Applicant</th>
                  <th className="py-3 px-4 font-semibold">Brand</th>
                  <th className="py-3 px-4 font-semibold">Owner Contact</th>
                  <th className="py-3 px-4 font-semibold">Business Type</th>
                  <th className="py-3 px-4 font-semibold">Shop Photos</th>
                  <th className="py-3 px-4 font-semibold">Submission Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Compliance Remarks</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/60' : 'divide-gray-100'}`}>
                {filteredApplications.map(app => {
                  const sCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING_REVIEW
                  const SIcon = sCfg.icon
                  const photoCount = app.shopImages?.length || 0
                  const isPhotoComplete = photoCount >= 2
                  const remarkText = app.correctionReason || app.rejectionReason || app.adminNotes || null

                  return (
                    <tr
                      key={app._id}
                      className={`transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'
                      }`}
                      onClick={() => navigate(`/admin/sellers/${app._id}`, { state: { tab: activeTab } })}
                    >
                      {/* Shop / Applicant */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 font-bold text-sm flex-shrink-0">
                            {(app.shopName || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold ${tp}`}>{app.shopName}</span>
                              {app.applicationReference && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border border-gray-800 bg-gray-900 text-gray-400">
                                  {app.applicationReference}
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] ${ts}`}>{app.ownerName || app.applicantName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-amber-500">{app.brandName || app.shopName}</span>
                        {app.brandNameNormalized && (
                          <span className="block text-[10px] font-mono text-gray-500">
                            @{app.brandNameNormalized}
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <p className="text-gray-300 font-medium">{app.phone || 'N/A'}</p>
                        <p className={`text-[11px] ${ts}`}>{app.email}</p>
                      </td>

                      {/* Business Type */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold border border-gray-700 bg-gray-800/60 text-gray-300 uppercase">
                          {app.businessType || 'individual'}
                        </span>
                      </td>

                      {/* Shop Photos */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                          isPhotoComplete
                            ? 'bg-green-500/10 text-green-400 border-green-500/25'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/25'
                        }`}>
                          {photoCount}/4 Photos
                        </span>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3 px-4">
                        <span className="text-gray-300">
                          {new Date(app.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className={`block text-[10px] ${ts}`}>
                          {new Date(app.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Current Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 ${sCfg.badgeCls}`}>
                          <SIcon size={12} /> {sCfg.label}
                        </span>
                      </td>

                      {/* Compliance Remarks / Correction Reason */}
                      <td className="py-3 px-4 max-w-xs truncate" title={remarkText || 'No remarks recorded'}>
                        {remarkText ? (
                          <span className="text-orange-400 font-medium truncate block max-w-[200px]">
                            {remarkText}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/sellers/${app._id}`, { state: { tab: activeTab } })}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-sm"
                          >
                            <FiEye size={12} /> View Application
                          </button>

                          <button
                            onClick={e => handleDownloadAgreement(e, app)}
                            disabled={downloadingId === app._id}
                            className={`p-1.5 border rounded-xl text-gray-400 hover:text-white transition-colors ${
                              isDarkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                            }`}
                            title="Download Seller Agreement PDF"
                          >
                            <FiDownload size={14} className={downloadingId === app._id ? 'animate-bounce text-amber-500' : ''} />
                          </button>

                          {/* Quick Workflow Buttons */}
                          {app.status !== 'APPROVED' && (
                            <button
                              onClick={() => setActionModal({ app, actionType: 'APPROVE' })}
                              className="p-1.5 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                              title="Quick Approve"
                            >
                              <FiCheckCircle size={14} />
                            </button>
                          )}

                          {!['APPROVED', 'REJECTED'].includes(app.status) && (
                            <button
                              onClick={() => setActionModal({ app, actionType: 'NEEDS_CORRECTION' })}
                              className="p-1.5 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors"
                              title="Request Correction"
                            >
                              <FiAlertCircle size={14} />
                            </button>
                          )}

                          {app.status !== 'REJECTED' && (
                            <button
                              onClick={() => setActionModal({ app, actionType: 'REJECT' })}
                              className="p-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="Reject Application"
                            >
                              <FiXCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer / Counter */}
        <div className={`p-3.5 border-t text-xs flex items-center justify-between ${
          isDarkMode ? 'border-gray-800 bg-black/30 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'
        }`}>
          <span>
            Showing <strong className={tp}>{filteredApplications.length}</strong> of <strong className={tp}>{applications.length}</strong> total seller applications
          </span>
          <span className="font-mono text-[11px] text-gray-500">
            Real-time Database Synchronized
          </span>
        </div>
      </div>
    </div>
  )
}

export default AdminSellers
