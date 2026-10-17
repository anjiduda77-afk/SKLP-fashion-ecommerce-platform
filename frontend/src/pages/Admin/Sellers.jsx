import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiBriefcase, FiCheckCircle, FiXCircle, FiSearch,
  FiClock, FiEye, FiRefreshCw,
  FiShield, FiFileText, FiChevronDown, FiChevronUp,
  FiAlertCircle, FiSlash, FiRotateCcw, FiFilter,
  FiDownload, FiMapPin
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'
import kycService from '../../services/kycService'

const STATUS_CONFIG = {
  PENDING_REVIEW:        { label: 'Pending Review',   color: 'yellow', icon: FiClock },
  NEEDS_CORRECTION:      { label: 'Needs Correction', color: 'orange', icon: FiAlertCircle },
  SUBMITTED:             { label: 'Submitted',         color: 'blue',   icon: FiFileText },
  UNDER_REVIEW:          { label: 'Under Review',      color: 'blue',   icon: FiEye },
  REVIEW_REQUIRED:       { label: 'Review Required',   color: 'orange', icon: FiAlertCircle },
  VERIFICATION_REQUIRED: { label: 'Verification Req.', color: 'orange', icon: FiAlertCircle },
  REQUEST_CHANGES:       { label: 'Changes Requested', color: 'orange', icon: FiAlertCircle },
  APPROVED:              { label: 'Approved',           color: 'green',  icon: FiCheckCircle },
  REJECTED:              { label: 'Rejected',           color: 'red',    icon: FiXCircle },
  SUSPENDED:             { label: 'Suspended',          color: 'red',    icon: FiSlash },
  DRAFT:                 { label: 'Draft',              color: 'gray',   icon: FiFileText },
}


const CC = {
  green:  'bg-green-500/10 text-green-500 border-green-500/25',
  yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/25',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/25',
  red:    'bg-red-500/10 text-red-500 border-red-500/25',
  gray:   'bg-gray-500/10 text-gray-400 border-gray-500/25',
}

const SF = ['ALL', 'PENDING_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'SUSPENDED']

function ActionModal({ app, actionType, onClose, onConfirm, isDarkMode }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const cfg = {
    APPROVE: {
      title: 'Approve Seller & Activate Store',
      btnColor: 'bg-green-500 hover:bg-green-600',
      btnText: 'Approve & Activate Seller',
      required: false,
      warning: 'Promoting this user to SELLER role will activate their seller hub access, register their boutique store, permanently lock their brand name, and initiate a 30-day Free Trial subscription.'
    },
    REJECT: {
      title: 'Reject Seller Application',
      btnColor: 'bg-red-500 hover:bg-red-600',
      btnText: 'Confirm Rejection',
      required: true,
      warning: 'A mandatory rejection reason must be recorded. The applicant will receive this exact reason to understand why their application could not be approved.'
    },
    NEEDS_CORRECTION: {
      title: 'Request Correction / Missing Details',
      btnColor: 'bg-orange-500 hover:bg-orange-600',
      btnText: 'Request Correction',
      required: true,
      warning: 'Specify the exact items requiring correction (e.g., clearer shop photographs, updated address, or re-uploading documents). The applicant will be able to edit allowed fields and resubmit.'
    },
    REQUEST_INFO: {
      title: 'Request Additional Info / Changes',
      btnColor: 'bg-orange-500 hover:bg-orange-600',
      btnText: 'Send Request',
      required: true,
      warning: 'Please specify the exact documentation or clarifications required from the applicant.'
    },
    SUSPEND: {
      title: 'Suspend Seller Store',
      btnColor: 'bg-red-500 hover:bg-red-600',
      btnText: 'Suspend Store',
      required: true,
      warning: 'Suspending this seller will freeze their active listings and prevent seller hub access.'
    },
    REACTIVATE: {
      title: 'Reactivate Seller Account',
      btnColor: 'bg-green-500 hover:bg-green-600',
      btnText: 'Reactivate Store',
      required: false,
      warning: 'This will restore the seller’s store access and listing visibility.'
    }
  }[actionType] || { title: actionType, btnColor: 'bg-amber-500', btnText: 'Confirm', required: false }

  const submit = async () => {
    if (cfg.required && !notes.trim()) {
      toast.error('A reason or instructions are mandatory for this action.')
      return
    }
    setLoading(true)
    await onConfirm(app._id, actionType, notes.trim())
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${isDarkMode ? 'bg-[#18181b] border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cfg.title}</h3>
        <div className={`p-3 rounded-xl border text-xs space-y-1 ${isDarkMode ? 'bg-black/30 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <p><span className="font-semibold text-amber-500">Shop / Brand:</span> {app.shopName || app.brandName || 'N/A'}</p>
          <p><span className="font-semibold">Applicant:</span> {app.ownerName || app.applicantName} ({app.email})</p>
          {cfg.warning && <p className="pt-1 text-[11px] text-amber-500 leading-relaxed font-medium">{cfg.warning}</p>}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder={cfg.required ? 'Mandatory reason / instructions for applicant…' : 'Optional internal notes or approval comments…'}
          className={`w-full p-3 rounded-xl border text-sm resize-none outline-none ${isDarkMode ? 'bg-black/40 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-gray-700 text-white' : 'border-gray-300 text-gray-700'}`}>Cancel</button>
          <button onClick={submit} disabled={loading} className={`px-5 py-2 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all ${cfg.btnColor}`}>
            {loading ? 'Processing…' : (cfg.btnText || 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplicationCard({ app, isDarkMode, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [kycData, setKycData] = useState(null)
  const [kycLoading, setKycLoading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [activeImageModal, setActiveImageModal] = useState(null)

  const sCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING_REVIEW
  const SIcon = sCfg.icon
  const tp = isDarkMode ? 'text-white' : 'text-gray-900'
  const ts = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const cb = isDarkMode ? 'bg-[#18181b] border-gray-800' : 'bg-white border-gray-200'
  const ib = isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'

  useEffect(() => {
    if (expanded && !kycData) {
      setKycLoading(true)
      kycService.getAdminApplicationKyc(app._id)
        .then(res => {
          if (res.data?.success) setKycData(res.data.kyc)
        })
        .catch(err => console.warn('Could not load verification dossier:', err.message))
        .finally(() => setKycLoading(false))
    }
  }, [expanded, app._id, kycData])

  const handleDownloadAgreement = async () => {
    try {
      setDownloadingPdf(true)
      toast.info('Downloading official Seller Agreement PDF...')
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
      toast.success('Agreement PDF downloaded!')
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('Could not download agreement PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const bAddr = app.businessAddress || {}
  const pAddr = app.pickupAddressSameAsBusiness ? bAddr : (app.pickupAddress || bAddr)
  const bLine = [bAddr.street, bAddr.street2, bAddr.city, bAddr.district, bAddr.state, bAddr.postalCode].filter(Boolean).join(', ')
  const pLine = [pAddr.street, pAddr.street2, pAddr.city, pAddr.district, pAddr.state, pAddr.postalCode].filter(Boolean).join(', ')
  const isComplete = (app.shopImages?.length || 0) >= 2 && !!app.ownerPhoto?.url && !!app.signature?.url

  return (
    <div className={`rounded-2xl border ${cb} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      {/* Card Header */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-base sm:text-lg flex-shrink-0">
              {(app.shopName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-bold truncate max-w-[160px] xs:max-w-none ${tp}`}>{app.shopName}</h3>
                {app.applicationReference && (
                  <span className="font-mono text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {app.applicationReference}
                  </span>
                )}
              </div>
              <p className={`text-xs ${ts} truncate max-w-[180px] xs:max-w-none`}>{app.ownerName || app.applicantName} · {app.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border flex items-center gap-1 ${CC[sCfg.color]}`}>
              <SIcon size={11}/> {sCfg.label}
            </span>
          </div>
        </div>

        {/* Quick Details Box */}
        <div className={`p-2.5 sm:p-3 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-x-2.5 sm:gap-x-3 gap-y-1.5 text-xs ${ib}`}>
          <p className={ts}><span className="font-semibold text-gray-300">Brand:</span> {app.brandName || app.shopName}</p>
          <p className={ts}><span className="font-semibold text-gray-300">Phone:</span> {app.phone || 'N/A'}</p>
          <p className={ts}><span className="font-semibold text-gray-300">Type:</span> {app.businessType || 'individual'}</p>
          <p className={ts}><span className="font-semibold text-gray-300">Shop Photos:</span> {app.shopImages?.length || 0} / 4</p>
        </div>

        {/* Correction/Rejection reason if active */}
        {(app.correctionReason || (app.status === 'REJECTED' && app.rejectionReason)) && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 space-y-1">
            <span className="font-bold text-[10px] uppercase tracking-wider">Admin Instructions / Reason:</span>
            <p className="text-white text-[11px] leading-relaxed">{app.correctionReason || app.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Expanded Dossier Section */}
      {expanded && (
        <div className={`border-t px-5 py-4 space-y-4 ${isDarkMode ? 'border-gray-800 bg-black/20' : 'border-gray-100 bg-gray-50/50'}`}>

          {/* Section A: Owner & Business Info */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Owner & Business Overview</p>
            <div className={`p-3 rounded-xl border text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 ${ib}`}>
              <p><span className={ts}>Legal Owner Name:</span> <strong className="text-white">{app.ownerName || app.applicantName}</strong></p>
              <p><span className={ts}>Date of Birth:</span> <span className="text-white">{app.dob || 'Not provided'}</span></p>
              <p><span className={ts}>Alt Phone:</span> <span className="text-white">{app.altPhone || 'None'}</span></p>
              <p><span className={ts}>Year Established:</span> <span className="text-white">{app.yearEstablished || 'N/A'}</span></p>
              <p><span className={ts}>Categories:</span> <span className="text-amber-500">{(app.productCategories || []).join(', ') || 'Fashion Apparel'}</span></p>
              <p><span className={ts}>GSTIN:</span> <span className="text-white font-mono">{app.gstNumber || 'Not Applicable'}</span></p>
            </div>
          </div>

          {/* Section B: Registered Business & Pickup Addresses */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Addresses</p>
            <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${ib}`}>
              <p className="flex items-start gap-1.5">
                <FiMapPin className="text-amber-500 mt-0.5 flex-shrink-0" size={12} />
                <span><strong className="text-white">Business:</strong> {bLine || 'Address on record'}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <FiMapPin className="text-green-500 mt-0.5 flex-shrink-0" size={12} />
                <span><strong className="text-white">Pickup:</strong> {app.pickupAddressSameAsBusiness ? 'Same as business address' : (pLine || 'Same')}</span>
              </p>
            </div>
          </div>

          {/* Section C: Shop Photographs (Min 2, Max 4) */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Shop Photographs ({app.shopImages?.length || 0})</p>
            {(app.shopImages || []).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {app.shopImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImageModal(img.url)}
                    className="relative rounded-xl overflow-hidden border border-gray-700 bg-black aspect-video cursor-pointer group"
                  >
                    <img src={img.url} alt={`Shop ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/80 px-1 py-0.5 rounded text-white font-mono">
                      Shop {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-xs italic ${ts}`}>No shop photographs attached.</p>
            )}
          </div>

          {/* Section D: Owner Photo & Signature Images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Owner Photo */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Owner Photograph</p>
              {app.ownerPhoto?.url ? (
                <div
                  onClick={() => setActiveImageModal(app.ownerPhoto.url)}
                  className="w-32 h-36 rounded-xl overflow-hidden border border-gray-700 bg-black cursor-pointer group relative"
                >
                  <img src={app.ownerPhoto.url} alt="Owner" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/80 px-1 py-0.5 rounded text-white">Owner Photo</span>
                </div>
              ) : (
                <p className={`text-xs italic ${ts}`}>No owner photograph attached.</p>
              )}
            </div>

            {/* Signature */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Signature Record</p>
              {app.signature?.url ? (
                <div
                  onClick={() => setActiveImageModal(app.signature.url)}
                  className="w-48 h-24 rounded-xl overflow-hidden border border-gray-700 bg-white p-2 flex items-center justify-center cursor-pointer group"
                >
                  <img src={app.signature.url} alt="Signature" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <p className={`text-xs italic ${ts}`}>No signature image uploaded.</p>
              )}
            </div>
          </div>

          {/* Section E: Application Completeness & Phone Verification Status */}
          <div className={`p-3.5 rounded-xl border space-y-2.5 ${isDarkMode ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <FiShield size={12}/> Application Completeness & Verification
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isComplete ? CC.green : CC.yellow}`}>
                {isComplete ? 'DOCUMENTS COMPLETE' : 'INCOMPLETE'}
              </span>
            </div>

            {kycLoading ? (
              <p className={`text-xs ${ts} animate-pulse`}>Loading verification status…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>Phone (Firebase OTP)</p>
                  <p className="font-bold text-xs mt-0.5 flex items-center gap-1">
                    {kycData?.phone?.status === 'VERIFIED' ? <span className="text-green-500">✓ VERIFIED</span> : <span className="text-yellow-500">○ PENDING</span>}
                  </p>
                  {kycData?.phone?.phoneMasked && <p className={`text-[10px] font-mono mt-0.5 ${ts}`}>{kycData.phone.phoneMasked}</p>}
                </div>
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>Shop Photographs</p>
                  <p className="font-bold text-xs mt-0.5">
                    {(app.shopImages?.length || 0) >= 2 ? (
                      <span className="text-green-500">✓ {app.shopImages?.length || 0} Photos Uploaded</span>
                    ) : (
                      <span className="text-orange-500">○ {app.shopImages?.length || 0} / 2 Minimum</span>
                    )}
                  </p>
                </div>
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>Owner Photograph</p>
                  <p className="font-bold text-xs mt-0.5">
                    {app.ownerPhoto?.url ? <span className="text-green-500">✓ Portrait Uploaded</span> : <span className="text-red-500">✗ Missing</span>}
                  </p>
                </div>
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>Signature Record</p>
                  <p className="font-bold text-xs mt-0.5">
                    {app.signature?.url ? <span className="text-green-500">✓ Signature On File</span> : <span className="text-red-500">✗ Missing</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section F: Terms Acceptance Record */}
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${ib}`}>
            <div>
              <span className="font-semibold text-white">Terms Acceptance Version:</span>
              <span className="ml-1.5 text-amber-500 font-mono font-bold">{app.sellerTermsVersion || 'v1.0'}</span>
              {app.termsAcceptedAt && (
                <p className={`text-[10px] mt-0.5 ${ts}`}>Accepted: {new Date(app.termsAcceptedAt).toLocaleString('en-IN')}</p>
              )}
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20">
              TERMS AGREED
            </span>
          </div>

          {/* Audit Logs */}
          {(app.auditLogs||[]).length > 0 && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${ts}`}>Application Audit Trail</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {[...app.auditLogs].reverse().map((log,i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${ib} border`}>
                    <FiShield size={11} className="text-amber-500 mt-0.5 flex-shrink-0"/>
                    <div>
                      <span className="font-semibold text-amber-500">{log.action}</span>
                      {log.newStatus && <span className={`ml-1 ${ts}`}>→ {log.newStatus}</span>}
                      {log.reason && <p className={`text-[11px] mt-0.5 ${ts}`}>{log.reason}</p>}
                      <p className={`text-[10px] mt-0.5 ${ts}`}>{new Date(log.timestamp).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Action Footer */}
      <div className={`border-t px-3.5 sm:px-5 py-3 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2.5 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2.5 justify-between xs:justify-start">
          <button onClick={() => setExpanded(e=>!e)} className={`text-xs font-semibold flex items-center gap-1 touch-target ${ts} hover:text-amber-500 transition-colors`}>
            {expanded ? <FiChevronUp size={14}/> : <FiChevronDown size={14}/>}
            {expanded ? 'Collapse' : 'View Full Application'}
          </button>
          <button
            onClick={handleDownloadAgreement}
            disabled={downloadingPdf}
            className={`text-xs font-semibold flex items-center gap-1 text-amber-500 hover:underline touch-target`}
          >
            <FiDownload size={13} /> {downloadingPdf ? 'Downloading…' : 'Agreement PDF'}
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full xs:w-auto justify-end">
          {app.status === 'SUSPENDED' && (
            <button onClick={() => onAction(app,'REACTIVATE')} className="flex-1 xs:flex-none px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/25 text-xs font-bold rounded-xl hover:bg-green-500/20 transition-all flex items-center justify-center gap-1 touch-target">
              <FiRotateCcw size={12}/> Reactivate
            </button>
          )}
          {app.status === 'APPROVED' && (
            <button onClick={() => onAction(app,'SUSPEND')} className="flex-1 xs:flex-none px-3 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/25 text-xs font-bold rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-1 touch-target">
              <FiSlash size={12}/> Suspend
            </button>
          )}
          {!['APPROVED','REJECTED'].includes(app.status) && (
            <button onClick={() => onAction(app,'NEEDS_CORRECTION')} className={`flex-1 xs:flex-none px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-bold rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-1 touch-target`}>
              <FiAlertCircle size={12}/> Request Correction
            </button>
          )}
          {app.status !== 'REJECTED' && (
            <button onClick={() => onAction(app,'REJECT')} className="flex-1 xs:flex-none px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/25 text-xs font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-1 touch-target">
              <FiXCircle size={12}/> Reject
            </button>
          )}
          {app.status !== 'APPROVED' && (
            <button onClick={() => onAction(app,'APPROVE')} className="flex-1 xs:flex-none px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 shadow-md shadow-green-500/20 transition-all flex items-center justify-center gap-1 touch-target">
              <FiCheckCircle size={12}/> Approve
            </button>
          )}
        </div>
      </div>

      {/* Lightbox / Image Modal */}
      {activeImageModal && (
        <div
          onClick={() => setActiveImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden bg-black p-2 border border-gray-700">
            <img src={activeImageModal} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded-xl" />
            <p className="text-center text-xs text-gray-400 mt-2">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminSellers() {
  const { isDarkMode } = useTheme()
  const [applications, setApplications] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sf, setSf]             = useState('ALL')
  const [modal, setModal]       = useState(null)

  const tp = isDarkMode ? 'text-white' : 'text-gray-900'
  const ts = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const cb = isDarkMode ? 'bg-[#18181b] border-gray-800' : 'bg-white border-gray-200'
  const ib = isDarkMode ? 'bg-black/30 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (sf !== 'ALL') params.status = sf
      if (search.trim()) params.search = search.trim()
      const res = await adminService.getSellerApplications(params)
      if (res.data?.success) setApplications(res.data.applications || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load seller applications')
    } finally { setLoading(false) }
  }, [sf, search])

  useEffect(() => { fetch() }, [fetch])

  const handleAction = (app, actionType) => {
    setModal({ app, actionType })
  }

  const confirmAction = async (id, actionType, notes) => {
    try {
      const res = await adminService.reviewSellerApplication(id, actionType, notes, notes)
      if (res.data?.success) {
        toast.success(res.data.message || `${actionType} processed successfully`)
        setModal(null)
        fetch()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to process ${actionType}`)
    }
  }

  const stats = {
    total:      applications.length,
    pending:    applications.filter(a=>['PENDING_REVIEW','SUBMITTED','UNDER_REVIEW'].includes(a.status)).length,
    correction: applications.filter(a=>['NEEDS_CORRECTION','REQUEST_CHANGES','REVIEW_REQUIRED'].includes(a.status)).length,
    approved:   applications.filter(a=>a.status==='APPROVED').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {modal && <ActionModal app={modal.app} actionType={modal.actionType} isDarkMode={isDarkMode} onClose={()=>setModal(null)} onConfirm={confirmAction}/>}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${tp}`}>Seller Applications & Requests</h2>
          <p className={`text-sm mt-0.5 ${ts}`}>Review seller onboarding applications, phone verification, and merchant documents.</p>
        </div>
        <button onClick={fetch} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${isDarkMode ? 'border-gray-800 text-gray-400 hover:text-white' : 'border-gray-300 text-gray-600'}`}>
          <FiRefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total Applications', value:stats.total,      cls:'text-gray-400',   Icon:FiBriefcase},
          {label:'Pending Review',     value:stats.pending,    cls:'text-yellow-500', Icon:FiClock},
          {label:'Needs Correction',   value:stats.correction, cls:'text-orange-500', Icon:FiAlertCircle},
          {label:'Approved Stores',    value:stats.approved,   cls:'text-green-500',  Icon:FiCheckCircle},
        ].map(s=>(
          <div key={s.label} className={`rounded-xl border p-3.5 ${cb}`}>
            <div className="flex items-center gap-2"><s.Icon size={15} className={s.cls}/><span className={`text-xs font-semibold ${ts}`}>{s.label}</span></div>
            <p className={`text-2xl font-bold mt-1 ${tp}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className={`rounded-xl border p-4 ${cb}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <FiSearch size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ts}`}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by shop, brand, applicant, or phone…" className={`w-full pl-9 pr-3 py-2 border text-sm rounded-xl ${ib}`}/>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <FiFilter size={13} className={ts}/>
            {SF.map(s=>(
              <button key={s} onClick={()=>setSf(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sf===s?'bg-amber-500 text-black border-amber-500':isDarkMode?'border-gray-800 text-gray-400 hover:text-white':'border-gray-200 text-gray-500'}`}>
                {s==='ALL'?'All':STATUS_CONFIG[s]?.label||s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : applications.length === 0 ? (
        <div className={`rounded-2xl border p-16 text-center ${cb}`}>
          <FiBriefcase size={40} className="mx-auto mb-3 text-amber-500 opacity-30"/>
          <h3 className={`text-lg font-bold ${tp}`}>No Applications Found</h3>
          <p className={`text-xs mt-1 ${ts}`}>No seller applications match your current filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {applications.map(app=><ApplicationCard key={app._id} app={app} isDarkMode={isDarkMode} onAction={handleAction}/>)}
        </div>
      )}
    </div>
  )
}

export default AdminSellers
