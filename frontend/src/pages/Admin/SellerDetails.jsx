import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@context/ThemeContext'
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiClock,
  FiFileText, FiDownload, FiPrinter, FiEye,
  FiAlertCircle, FiSlash, FiRotateCcw, FiMapPin,
  FiUser, FiBriefcase, FiImage, FiShield,
  FiPhone, FiMail, FiCalendar,
  FiMaximize2, FiX, FiCheck, FiExternalLink
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'

const STATUS_CONFIG = {
  PENDING_REVIEW:        { label: 'Pending Review',   badgeCls: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25', icon: FiClock },
  SUBMITTED:             { label: 'Submitted',         badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',     icon: FiFileText },
  UNDER_REVIEW:          { label: 'Under Review',      badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',     icon: FiEye },
  NEEDS_CORRECTION:      { label: 'Needs Correction', badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  REVIEW_REQUIRED:       { label: 'Review Required',   badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  REQUEST_CHANGES:       { label: 'Changes Requested', badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  VERIFICATION_REQUIRED: { label: 'Verification Req.', badgeCls: 'bg-orange-500/10 text-orange-400 border-orange-500/25', icon: FiAlertCircle },
  APPROVED:              { label: 'Approved Store',    badgeCls: 'bg-green-500/10 text-green-500 border-green-500/25',   icon: FiCheckCircle },
  REJECTED:              { label: 'Rejected',           badgeCls: 'bg-red-500/10 text-red-500 border-red-500/25',       icon: FiXCircle },
  SUSPENDED:             { label: 'Suspended',          badgeCls: 'bg-red-500/10 text-red-500 border-red-500/25',       icon: FiSlash },
  DRAFT:                 { label: 'Draft',              badgeCls: 'bg-gray-500/10 text-gray-400 border-gray-500/25',     icon: FiFileText }
}

function ReviewActionModal({ app, actionType, onClose, onConfirm, isDarkMode }) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cfg = {
    APPROVE: {
      title: 'Approve Seller Application & Activate Store',
      btnColor: 'bg-green-600 hover:bg-green-700',
      btnText: 'Approve & Activate Seller',
      required: false,
      warning: 'Promoting this applicant will grant immediate Seller Hub access, register their store in the active marketplace, permanently lock their brand name, and initiate a 30-day Free Trial subscription.'
    },
    REJECT: {
      title: 'Reject Seller Application',
      btnColor: 'bg-red-600 hover:bg-red-700',
      btnText: 'Confirm Rejection',
      required: true,
      warning: 'A clear rejection reason must be recorded. This explanation will be provided to the applicant.'
    },
    NEEDS_CORRECTION: {
      title: 'Request Application Correction',
      btnColor: 'bg-orange-600 hover:bg-orange-700',
      btnText: 'Request Correction',
      required: true,
      warning: 'Specify the exact items that need correction (for example, clearer shop photographs, updated address, or valid tax documents). The applicant will be able to edit allowed fields and resubmit.'
    },
    SUSPEND: {
      title: 'Suspend Seller Store',
      btnColor: 'bg-red-600 hover:bg-red-700',
      btnText: 'Suspend Store',
      required: true,
      warning: 'Suspending this seller will deactivate their active product listings and freeze Seller Hub access.'
    },
    REACTIVATE: {
      title: 'Reactivate Seller Account',
      btnColor: 'bg-green-600 hover:bg-green-700',
      btnText: 'Reactivate Store',
      required: false,
      warning: 'This will restore the seller account to active status and reinstate catalog visibility.'
    }
  }[actionType] || { title: actionType, btnColor: 'bg-amber-600', btnText: 'Confirm', required: false }

  const handleConfirm = async () => {
    if (cfg.required && !notes.trim()) {
      toast.error('A reason or instructions are required for this action.')
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
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {cfg.title}
          </h3>
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
            <p className="pt-2 text-[11px] text-amber-500/90 leading-relaxed border-t border-gray-800">
              {cfg.warning}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {cfg.required ? 'Mandatory Reason / Correction Instructions *' : 'Internal Notes / Remarks (Optional)'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder={cfg.required ? 'Provide clear, actionable details for the applicant…' : 'Enter internal compliance remarks or approval notes…'}
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
            onClick={handleConfirm}
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

function AgreementPreviewModal({ applicationId, appRef, onClose, isDarkMode }) {
  const [loading, setLoading] = useState(true)
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)

  useEffect(() => {
    let activeUrl = null
    const loadPdf = async () => {
      try {
        setLoading(true)
        const res = await adminService.downloadSellerAgreementPdf(applicationId)
        const blob = new Blob([res.data], { type: 'application/pdf' })
        activeUrl = window.URL.createObjectURL(blob)
        setPdfBlobUrl(activeUrl)
      } catch (err) {
        console.error('PDF preview error:', err)
        toast.error('Unable to generate PDF preview.')
        onClose()
      } finally {
        setLoading(false)
      }
    }
    loadPdf()

    return () => {
      if (activeUrl) window.URL.revokeObjectURL(activeUrl)
    }
  }, [applicationId, onClose])

  const handleDownload = () => {
    if (!pdfBlobUrl) return
    const link = document.createElement('a')
    link.href = pdfBlobUrl
    link.setAttribute('download', `StyleStreet_Seller_Agreement_${appRef || applicationId}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
    toast.success('Seller Agreement PDF downloaded.')
  }

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-preview-frame')
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print()
    } else {
      window.print()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className={`w-full max-w-5xl h-[90vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
        isDarkMode ? 'bg-[#18181b] border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-gray-800 bg-black/40' : 'border-gray-200 bg-gray-50'
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <FiFileText className="text-amber-500" /> Seller Agreement Preview
            </h3>
            <p className="text-xs text-gray-500 font-mono">Reference: {appRef || applicationId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!pdfBlobUrl}
              className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isDarkMode ? 'border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FiPrinter size={13} /> Print
            </button>
            <button
              onClick={handleDownload}
              disabled={!pdfBlobUrl}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              <FiDownload size={13} /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 bg-neutral-900 relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs uppercase tracking-wider font-semibold">Generating Real Agreement PDF…</p>
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              id="pdf-preview-frame"
              src={pdfBlobUrl}
              title="Seller Agreement Preview"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">
              Failed to load document preview.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ImageLightbox({ imageUrl, title, onClose }) {
  if (!imageUrl) return null
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-pointer"
    >
      <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden bg-black p-2 border border-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-2 text-xs text-gray-300 border-b border-gray-800 mb-2">
          <span className="font-semibold text-amber-500">{title || 'Photograph Preview'}</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <FiX size={16} />
          </button>
        </div>
        <img
          src={imageUrl}
          alt={title || 'Preview'}
          className="max-w-full max-h-[72vh] object-contain rounded-xl mx-auto"
        />
        <p className="text-center text-[11px] text-gray-500 mt-2">Click outside or press Close to dismiss</p>
      </div>
    </div>
  )
}

export default function AdminSellerDetails() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isDarkMode } = useTheme()

  const [application, setApplication] = useState(null)
  const [kycData, setKycData] = useState(null)
  const [sellerData, setSellerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [actionModal, setActionModal] = useState(null)
  const [showAgreementPreview, setShowAgreementPreview] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const tp = isDarkMode ? 'text-white' : 'text-gray-900'
  const ts = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const cardBg = isDarkMode ? 'bg-[#18181b] border-gray-800' : 'bg-white border-gray-200'
  const subBoxBg = isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminService.getSellerApplicationById(applicationId)
      if (res.data?.success) {
        setApplication(res.data.application)
        setKycData(res.data.kyc)
        setSellerData(res.data.seller)
      }
    } catch (err) {
      console.error('Failed to load application:', err)
      toast.error(err.response?.data?.message || 'Failed to load seller application details')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchApplication()
  }, [fetchApplication])

  const handleReviewAction = async (id, actionType, notes) => {
    try {
      const res = await adminService.reviewSellerApplication(id, actionType, notes, notes)
      if (res.data?.success) {
        toast.success(res.data.message || `Application ${actionType.toLowerCase()} successful.`)
        setActionModal(null)
        await fetchApplication()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to process ${actionType}`)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      toast.info('Generating official Seller Agreement PDF…')
      const res = await adminService.downloadSellerAgreementPdf(applicationId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const ref = application?.applicationReference || applicationId
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
      setDownloadingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className={`text-xs uppercase tracking-widest font-semibold ${ts}`}>
          Loading Seller Application Dossier…
        </p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
        <FiAlertCircle size={44} className="mx-auto mb-3 text-red-500/80" />
        <h2 className={`text-xl font-bold ${tp}`}>Seller Application Not Found</h2>
        <p className={`text-xs mt-1 max-w-md mx-auto ${ts}`}>
          The application record with ID {applicationId} could not be located in the database.
        </p>
        <button
          onClick={() => navigate('/admin/sellers')}
          className="mt-6 px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-xl"
        >
          Return to Seller Applications
        </button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[application.status] || STATUS_CONFIG.PENDING_REVIEW
  const StatusIcon = statusCfg.icon
  const shopPhotos = application.shopImages || []
  const uploadedPhotosCount = shopPhotos.length
  const bAddr = application.businessAddress || {}
  const pAddr = application.pickupAddressSameAsBusiness ? bAddr : (application.pickupAddress || bAddr)
  const bLine = [bAddr.street, bAddr.street2, bAddr.city, bAddr.district, bAddr.state, bAddr.postalCode].filter(Boolean).join(', ')
  const pLine = [pAddr.street, pAddr.street2, pAddr.city, pAddr.district, pAddr.state, pAddr.postalCode].filter(Boolean).join(', ')

  const tabs = [
    { id: 'overview',  label: 'Owner & Overview', icon: FiUser },
    { id: 'business',  label: 'Business & Store', icon: FiBriefcase },
    { id: 'photos',    label: `Shop Photos (${uploadedPhotosCount}/4)`, icon: FiImage },
    { id: 'documents', label: 'Documents & Signature', icon: FiShield },
    { id: 'history',   label: `Audit Trail (${(application.auditLogs || []).length})`, icon: FiClock }
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Review Action Modal */}
      {actionModal && (
        <ReviewActionModal
          app={application}
          actionType={actionModal}
          isDarkMode={isDarkMode}
          onClose={() => setActionModal(null)}
          onConfirm={handleReviewAction}
        />
      )}

      {/* Agreement Preview Modal */}
      {showAgreementPreview && (
        <AgreementPreviewModal
          applicationId={application._id}
          appRef={application.applicationReference}
          isDarkMode={isDarkMode}
          onClose={() => setShowAgreementPreview(false)}
        />
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/sellers', { state: location.state })}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isDarkMode ? 'border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiArrowLeft size={16} /> Back to Applications
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-2xl font-serif font-bold ${tp}`}>
                {application.shopName}
              </h1>
              {application.applicationReference && (
                <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500 font-semibold">
                  {application.applicationReference}
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${ts}`}>
              Brand: <span className="font-semibold text-amber-500">{application.brandName || application.shopName}</span> · Submitted {new Date(application.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Current Status Badge & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusCfg.badgeCls}`}>
            <StatusIcon size={14} /> {statusCfg.label}
          </span>
          <button
            onClick={() => setShowAgreementPreview(true)}
            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isDarkMode ? 'border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiEye size={13} /> Preview Agreement
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <FiDownload size={13} /> {downloadingPdf ? 'Generating…' : 'Agreement PDF'}
          </button>
        </div>
      </div>

      {/* Admin Action Bar (Workflow Execution) */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardBg}`}>
        <div className="space-y-0.5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-amber-500">Compliance & Review Controls</span>
          <p className={`text-xs ${ts}`}>
            Select an action to update application workflow, notify merchant, and synchronize seller records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {application.status === 'SUSPENDED' && (
            <button
              onClick={() => setActionModal('REACTIVATE')}
              className="px-4 py-2 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <FiRotateCcw size={13} /> Reactivate Store
            </button>
          )}

          {application.status === 'APPROVED' && (
            <button
              onClick={() => setActionModal('SUSPEND')}
              className="px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <FiSlash size={13} /> Suspend Store
            </button>
          )}

          {!['APPROVED', 'REJECTED'].includes(application.status) && (
            <button
              onClick={() => setActionModal('NEEDS_CORRECTION')}
              className="px-4 py-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <FiAlertCircle size={13} /> Request Correction
            </button>
          )}

          {application.status !== 'REJECTED' && (
            <button
              onClick={() => setActionModal('REJECT')}
              className="px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <FiXCircle size={13} /> Reject Application
            </button>
          )}

          {application.status !== 'APPROVED' && (
            <button
              onClick={() => setActionModal('APPROVE')}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-green-600/20"
            >
              <FiCheckCircle size={13} /> Approve & Activate Seller
            </button>
          )}
        </div>
      </div>

      {/* Remarks Banner (If in Needs Correction or Rejected) */}
      {(application.correctionReason || (application.status === 'REJECTED' && application.rejectionReason)) && (
        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
            <FiAlertCircle size={14} /> Active Compliance Notice / Rejection Reason:
          </div>
          <p className="text-white text-xs leading-relaxed pl-5">
            {application.correctionReason || application.rejectionReason}
          </p>
        </div>
      )}

      {/* Section Navigation Tabs */}
      <div className="flex border-b border-gray-800 gap-1 overflow-x-auto scrollbar-none">
        {tabs.map(tab => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <TabIcon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">

        {/* TAB 1: OWNER & PERSONAL DETAILS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Owner Profile Card */}
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
              <div className="flex items-center gap-4">
                {application.ownerPhoto?.url ? (
                  <img
                    src={application.ownerPhoto.url}
                    alt={application.ownerName || 'Owner'}
                    onClick={() => setLightboxImage({ url: application.ownerPhoto.url, title: 'Owner Portrait' })}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-2xl">
                    {(application.ownerName || application.applicantName || 'O').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className={`font-bold text-base ${tp}`}>{application.ownerName || application.applicantName}</h3>
                  <p className={`text-xs ${ts}`}>Legal Applicant & Signatory</p>
                  <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    User ID: {application.userId?._id || application.userId || 'N/A'}
                  </span>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${subBoxBg}`}>
                <div className="flex items-center gap-2">
                  <FiMail className="text-amber-500 flex-shrink-0" size={13} />
                  <span className="text-gray-400 truncate">{application.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiPhone className="text-amber-500 flex-shrink-0" size={13} />
                  <span className="text-gray-300 font-mono">{application.phone || 'N/A'}</span>
                </div>
                {application.altPhone && (
                  <div className="flex items-center gap-2">
                    <FiPhone className="text-gray-500 flex-shrink-0" size={13} />
                    <span className="text-gray-400 font-mono">Alt: {application.altPhone}</span>
                  </div>
                )}
                {application.dob && (
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-amber-500 flex-shrink-0" size={13} />
                    <span className="text-gray-400">DOB: {application.dob}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Entity Overview */}
            <div className={`lg:col-span-2 p-6 rounded-2xl border space-y-4 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-base ${tp}`}>Enterprise Particulars</h3>
                <span className="text-xs text-amber-500 uppercase tracking-wider font-semibold">
                  {application.businessType || 'individual'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3.5 rounded-xl border space-y-1 ${subBoxBg}`}>
                  <span className="text-gray-500 font-medium">Boutique / Shop Name</span>
                  <p className={`font-bold text-sm ${tp}`}>{application.shopName}</p>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 ${subBoxBg}`}>
                  <span className="text-gray-500 font-medium">Trademark / Brand Name</span>
                  <p className="font-bold text-sm text-amber-500">{application.brandName || application.shopName}</p>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 ${subBoxBg}`}>
                  <span className="text-gray-500 font-medium">Product Apparel Segments</span>
                  <p className="text-gray-300">
                    {(application.productCategories || []).join(', ') || 'Fashion Apparel & Couture'}
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 ${subBoxBg}`}>
                  <span className="text-gray-500 font-medium">Year Established</span>
                  <p className="text-gray-300 font-mono">{application.yearEstablished || 'Not Specified'}</p>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 sm:col-span-2 ${subBoxBg}`}>
                  <span className="text-gray-500 font-medium">Registered Business Address</span>
                  <p className="text-gray-300 flex items-start gap-1.5 mt-0.5">
                    <FiMapPin className="text-amber-500 flex-shrink-0 mt-0.5" size={13} />
                    {bLine || 'Address on record'}
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-1 sm:col-span-2 ${subBoxBg}`}>
                  <span className="text-gray-500 font-medium">Dispatch & Courier Pickup Location</span>
                  <p className="text-gray-300 flex items-start gap-1.5 mt-0.5">
                    <FiMapPin className="text-green-500 flex-shrink-0 mt-0.5" size={13} />
                    {application.pickupAddressSameAsBusiness ? 'Identical to registered business address' : (pLine || 'Same as business address')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUSINESS & STORE DETAILS */}
        {activeTab === 'business' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commercial & Tax Identifiers */}
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
              <h3 className={`font-bold text-base ${tp}`}>Legal & Tax Registration</h3>
              <div className="space-y-3 text-xs">
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${subBoxBg}`}>
                  <div>
                    <span className="text-gray-500 block">GSTIN (Goods & Services Tax)</span>
                    <span className="font-mono font-bold text-sm text-white">
                      {application.gstNumber || application.verification?.gst?.gstin || 'Not Applicable'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/25">
                    {application.gstNumber ? 'VERIFIED' : 'EXEMPT'}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${subBoxBg}`}>
                  <div>
                    <span className="text-gray-500 block">PAN (Permanent Account Number)</span>
                    <span className="font-mono font-bold text-sm text-white">
                      {application.panNumber || application.verification?.pan?.number || 'Not Stored'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/25">
                    RECORDED
                  </span>
                </div>

                {application.verification?.udyam?.number && (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${subBoxBg}`}>
                    <div>
                      <span className="text-gray-500 block">Udyam MSME Registration</span>
                      <span className="font-mono text-white">{application.verification.udyam.number}</span>
                    </div>
                  </div>
                )}

                {application.verification?.company?.cin && (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${subBoxBg}`}>
                    <div>
                      <span className="text-gray-500 block">Corporate Identification Number (CIN)</span>
                      <span className="font-mono text-white">{application.verification.company.cin}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Settlement Account */}
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
              <h3 className={`font-bold text-base ${tp}`}>Merchant Settlement Banking</h3>
              <div className={`p-4 rounded-xl border space-y-3 text-xs ${subBoxBg}`}>
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <span className="text-gray-400">Account Beneficiary</span>
                  <span className="font-bold text-white">{application.bankDetails?.accountName || application.ownerName || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <span className="text-gray-400">Account Number</span>
                  <span className="font-mono font-bold text-amber-500">
                    {application.bankDetails?.accountNumber
                      ? `•••• •••• ${application.bankDetails.accountNumber.slice(-4)}`
                      : 'Not Recorded'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <span className="text-gray-400">IFSC Code</span>
                  <span className="font-mono text-white">{application.bankDetails?.ifscCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Bank Name</span>
                  <span className="text-white">{application.bankDetails?.bankName || 'Direct NEFT/IMPS'}</span>
                </div>
              </div>

              {/* Commercial Terms Notice */}
              <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${subBoxBg}`}>
                <span className="text-amber-500 font-bold block text-[11px] uppercase tracking-wider">Commercial Terms</span>
                <p className="text-gray-300">Platform Commission: <strong>5% net order value</strong></p>
                <p className="text-gray-300">Settlement SLA: <strong>7 days post confirmed delivery</strong></p>
                <p className="text-gray-300">Trial Period: <strong>30-Day Free Trial upon approval</strong></p>
              </div>

              {sellerData && (
                <div className={`p-4 rounded-xl border text-xs space-y-1.5 border-green-500/25 bg-green-500/5`}>
                  <span className="text-green-400 font-bold block text-[11px] uppercase tracking-wider">Active Store Record</span>
                  <p className="text-gray-300">Shop Slug: <strong className="font-mono text-white">@{sellerData.shopSlug}</strong></p>
                  <p className="text-gray-300">Plan: <strong className="capitalize text-white">{sellerData.currentPlan || 'trial'}</strong> · Status: <strong className="capitalize text-green-400">{sellerData.sellerStatus}</strong></p>
                  <p className="text-gray-300">Rating: <strong className="text-amber-400">{sellerData.rating || 0} / 5</strong> ({sellerData.numReviews || 0} reviews)</p>
                </div>
              )}
            </div>

            {/* Business Description */}
            {application.storeDescription && (
              <div className={`lg:col-span-2 p-6 rounded-2xl border space-y-2 ${cardBg}`}>
                <h3 className={`font-bold text-base ${tp}`}>Business Profile & Description</h3>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                  {application.storeDescription}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SHOP IMAGES GALLERY */}
        {activeTab === 'photos' && (
          <div className={`p-6 rounded-2xl border space-y-6 ${cardBg}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className={`font-bold text-base ${tp}`}>Physical Store Photographs</h3>
                <p className={`text-xs ${ts}`}>
                  Uploaded: <strong className="text-amber-500">{uploadedPhotosCount}</strong> of 4 photographs (Minimum 2 required for onboarding verification)
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                uploadedPhotosCount >= 2 ? 'bg-green-500/10 text-green-400 border-green-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'
              }`}>
                {uploadedPhotosCount >= 2 ? 'Meets Photo Requirement' : 'Missing Required Photos'}
              </span>
            </div>

            {uploadedPhotosCount === 0 ? (
              <div className={`p-12 text-center rounded-xl border ${subBoxBg}`}>
                <FiImage size={36} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm font-semibold text-gray-400">No Shop Photographs Uploaded</p>
                <p className="text-xs text-gray-500 mt-1">Applicant has not provided physical shop photographs with this submission.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shopPhotos.map((img, idx) => {
                  const imgUrl = typeof img === 'string' ? img : (img.url || img.secure_url)
                  const imgType = (img.imageType || `Photograph #${idx + 1}`).replace('_', ' ')
                  return (
                    <div
                      key={idx}
                      className={`group relative rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${subBoxBg}`}
                    >
                      <div className="aspect-[4/3] bg-black/40 relative overflow-hidden flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={imgType}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">Image not available</span>
                        )}
                        <div
                          onClick={() => imgUrl && setLightboxImage({ url: imgUrl, title: imgType.toUpperCase() })}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-xs font-bold transition-opacity cursor-pointer"
                        >
                          <FiMaximize2 size={16} /> View Full Size
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between text-xs">
                        <span className="capitalize font-semibold text-gray-300">{imgType}</span>
                        <span className="text-[10px] text-gray-500 font-mono">#{idx + 1}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Placeholders for remaining uploads to reach 4 */}
                {Array.from({ length: Math.max(0, 4 - uploadedPhotosCount) }).map((_, i) => (
                  <div
                    key={`missing-${i}`}
                    className={`rounded-2xl border-2 border-dashed border-gray-800 p-6 flex flex-col items-center justify-center text-center aspect-[4/3] ${subBoxBg}`}
                  >
                    <FiImage size={24} className="text-gray-700 mb-1" />
                    <span className="text-xs font-semibold text-gray-500">Slot #{uploadedPhotosCount + i + 1} Empty</span>
                    <span className="text-[10px] text-gray-600 mt-0.5">Not provided</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DOCUMENTS & SIGNATURE */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Signature Record */}
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-base ${tp}`}>Recorded Owner Signature</h3>
                <span className="text-xs text-green-500 font-bold flex items-center gap-1">
                  <FiCheck size={12} /> Digitally Captured
                </span>
              </div>

              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center min-h-[160px] ${subBoxBg}`}>
                {application.signature?.url ? (
                  <img
                    src={application.signature.url}
                    alt="Owner Signature"
                    onClick={() => setLightboxImage({ url: application.signature.url, title: 'Owner Signature' })}
                    className="max-h-28 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="text-center text-gray-500 space-y-1">
                    <p className="font-bold text-sm text-amber-500">{application.ownerName || application.applicantName}</p>
                    <p className="text-[10px]">[Digitally recorded applicant agreement signature]</p>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-400 space-y-1 pt-1">
                <p>Signatory: <strong className="text-white">{application.ownerName || application.applicantName}</strong></p>
                <p>Terms Acceptance: <span className="text-amber-500 font-mono">STYLE STREET Seller Terms {application.sellerTermsVersion || 'v1.0'}</span></p>
                <p>Recorded Date: <span className="text-gray-300 font-mono">{new Date(application.termsAcceptedAt || application.createdAt).toLocaleString('en-IN')}</span></p>
              </div>
            </div>

            {/* Uploaded Verification Documents */}
            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
              <h3 className={`font-bold text-base ${tp}`}>Uploaded Compliance Documents</h3>
              <div className="space-y-3">
                {application.documents && application.documents.length > 0 ? (
                  application.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${subBoxBg}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FiFileText className="text-amber-500 flex-shrink-0" size={16} />
                        <div>
                          <p className="font-semibold text-white capitalize">{doc.type || `Document #${idx + 1}`}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{doc.number || doc.fileName || 'Verified'}</p>
                        </div>
                      </div>
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-lg font-bold text-[11px] hover:bg-amber-500/20 flex items-center gap-1"
                        >
                          <FiExternalLink size={12} /> View
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-500">Stored on file</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={`p-8 text-center rounded-xl border ${subBoxBg}`}>
                    <FiShield size={28} className="mx-auto mb-2 text-gray-600" />
                    <p className="text-xs text-gray-400">Standard online verification completed via OTP & contact validation.</p>
                  </div>
                )}
              </div>

              {kycData && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 border-amber-500/25 bg-amber-500/5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500 font-bold text-[11px] uppercase tracking-wider">KYC Compliance Status</span>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      {kycData.overallStatus || 'PENDING'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                    <p>Phone OTP: <strong className="text-green-400">{kycData.phone?.status || 'VERIFIED'}</strong></p>
                    <p>PAN Card: <strong className="text-white">{kycData.pan?.status || 'NOT_SUBMITTED'}</strong></p>
                    <p>GST Registry: <strong className="text-white">{kycData.gst?.status || 'NOT_APPLICABLE'}</strong></p>
                    <p>Bank Account: <strong className="text-white">{kycData.bank?.status || 'RECORDED'}</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL & HISTORY */}
        {activeTab === 'history' && (
          <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
            <h3 className={`font-bold text-base ${tp}`}>Application Event Log & Compliance History</h3>

            {(!application.auditLogs || application.auditLogs.length === 0) ? (
              <div className={`p-8 text-center rounded-xl border ${subBoxBg}`}>
                <FiClock size={28} className="mx-auto mb-2 text-gray-600" />
                <p className="text-xs text-gray-400">Initial submission record created. No subsequent administrator actions recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b border-gray-800 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Action</th>
                      <th className="py-2.5 px-3 font-semibold">Status Transition</th>
                      <th className="py-2.5 px-3 font-semibold">Administrator</th>
                      <th className="py-2.5 px-3 font-semibold">Remarks / Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {application.auditLogs.slice().reverse().map((log, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono text-gray-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-amber-500 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono text-gray-400">{log.oldStatus || 'N/A'}</span>
                          <span className="mx-1 text-gray-600">→</span>
                          <span className="font-mono font-bold text-white">{log.newStatus}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                          {log.adminId?.email || log.adminId?.firstName || 'Compliance System'}
                        </td>
                        <td className="py-3 px-3 text-gray-300 max-w-xs break-words">
                          {log.reason || 'No remarks recorded.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
