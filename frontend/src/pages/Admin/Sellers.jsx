import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiBriefcase, FiCheckCircle, FiXCircle, FiSearch,
  FiAlertTriangle, FiClock, FiEye, FiRefreshCw,
  FiShield, FiFileText, FiChevronDown, FiChevronUp,
  FiAlertCircle, FiSlash, FiRotateCcw, FiFilter
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import adminService from '../../services/adminService'
import kycService from '../../services/kycService'

const STATUS_CONFIG = {
  PENDING_REVIEW:        { label: 'Pending Review',   color: 'yellow', icon: FiClock },
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

const RISK_CONFIG = {
  LOW_RISK:    { label: 'Low Risk',    color: 'green' },
  MEDIUM_RISK: { label: 'Medium Risk', color: 'yellow' },
  HIGH_RISK:   { label: 'High Risk',   color: 'red' },
}

const CC = {
  green:  'bg-green-500/10 text-green-500 border-green-500/25',
  yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/25',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/25',
  red:    'bg-red-500/10 text-red-500 border-red-500/25',
  gray:   'bg-gray-500/10 text-gray-400 border-gray-500/25',
}

const SF = ['ALL', 'PENDING_REVIEW', 'UNDER_REVIEW', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED']

function ActionModal({ app, actionType, onClose, onConfirm, isDarkMode }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const cfg = {
    APPROVE: {
      title: 'Approve Seller & Lock Brand',
      btnColor: 'bg-green-500 hover:bg-green-600',
      btnText: 'Approve & Activate Seller',
      required: false,
      warning: 'Promoting this user to SELLER role will activate their seller account, register their boutique store, and permanently lock their brand name to prevent duplicate brand squatting.'
    },
    REJECT: {
      title: 'Reject Seller Application',
      btnColor: 'bg-red-500 hover:bg-red-600',
      btnText: 'Confirm Rejection',
      required: true,
      warning: 'A rejection notification will be recorded and the applicant will receive the mandatory reason provided below.'
    },
    REQUEST_INFO: {
      title: 'Request Additional Info / Changes',
      btnColor: 'bg-orange-500 hover:bg-orange-600',
      btnText: 'Send Request',
      required: true,
      warning: 'Please specify the exact documentation or corrections required from the applicant.'
    },
    SUSPEND: {
      title: 'Suspend Seller Store',
      btnColor: 'bg-red-500 hover:bg-red-600',
      btnText: 'Suspend Store',
      required: true,
      warning: 'Suspending this seller will freeze their active listings and boutique catalog.'
    },
    REACTIVATE: {
      title: 'Reactivate Seller Account',
      btnColor: 'bg-green-500 hover:bg-green-600',
      btnText: 'Reactivate Store',
      required: false,
      warning: 'This will restore the seller’s store access and listing visibility.'
    }
  }[actionType] || { title: actionType, btnColor: 'bg-luxury-gold', btnText: 'Confirm', required: false }

  const submit = async () => {
    if (cfg.required && !notes.trim()) {
      toast.error('A reason or notes are mandatory for this action.')
      return
    }
    setLoading(true)
    await onConfirm(app._id, actionType, notes.trim())
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cfg.title}</h3>
        <div className={`p-3 rounded-xl border text-xs space-y-1 ${isDarkMode ? 'bg-black/30 border-luxury-darkGray text-luxury-mediumGray' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <p><span className="font-semibold text-luxury-gold">Shop / Brand:</span> {app.shopName || app.brandName || 'N/A'}</p>
          <p><span className="font-semibold">Applicant:</span> {app.applicantName} ({app.email})</p>
          {cfg.warning && <p className="pt-1 text-[11px] text-amber-500 leading-relaxed font-medium">{cfg.warning}</p>}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder={cfg.required ? 'Mandatory reason / instructions for applicant…' : 'Optional approval notes or internal comments…'}
          className={`w-full p-3 rounded-xl border text-sm resize-none outline-none ${isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white placeholder-luxury-mediumGray' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2 border rounded-xl text-xs font-bold ${isDarkMode ? 'border-luxury-darkGray text-white' : 'border-gray-300 text-gray-700'}`}>Cancel</button>
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

  const sCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING_REVIEW
  const rCfg = RISK_CONFIG[app.riskLevel] || RISK_CONFIG.LOW_RISK
  const SIcon = sCfg.icon
  const tp = isDarkMode ? 'text-white' : 'text-gray-900'
  const ts = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const cb = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const ib = isDarkMode ? 'bg-luxury-black/40 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'

  useEffect(() => {
    if (expanded && !kycData) {
      setKycLoading(true)
      kycService.getAdminApplicationKyc(app._id)
        .then(res => {
          if (res.data?.success) setKycData(res.data.kyc)
        })
        .catch(err => console.warn('Could not load KYC dossier:', err.message))
        .finally(() => setKycLoading(false))
    }
  }, [expanded, app._id, kycData])

  const flags = (app.riskFlags || []).filter(f => !['DUPLICATE_RISK','REVIEW_REQUIRED'].includes(f))

  return (
    <div className={`rounded-2xl border ${cb} overflow-hidden`}>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center text-luxury-gold font-bold text-lg flex-shrink-0">
              {(app.shopName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className={`font-bold truncate ${tp}`}>{app.shopName}</h3>
              <p className={`text-xs ${ts}`}>{app.applicantName} · {app.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${CC[sCfg.color]}`}>
              <SIcon size={11}/> {sCfg.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${CC[rCfg.color]}`}>
              {rCfg.label} · {app.riskScore ?? 0}pts
            </span>
          </div>
        </div>

        <div className={`p-3 rounded-xl border grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${ib}`}>
          <p className={ts}><span className="font-semibold">Phone:</span> {app.phone || 'N/A'}</p>
          <p className={ts}><span className="font-semibold">Type:</span> {app.businessType || 'N/A'}</p>
          <p className={ts}><span className="font-semibold">PAN:</span> {app.panNumber || 'Not provided'}</p>
          <p className={ts}><span className="font-semibold">GST:</span> {app.gstNumber || 'Not provided'}</p>
          <p className={`${ts} col-span-2`}><span className="font-semibold">Applied:</span> {new Date(app.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
        </div>

        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flags.map((f, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                <FiAlertTriangle size={9}/> {f}
              </span>
            ))}
          </div>
        )}

        {app.adminNotes && (
          <div className={`p-2.5 rounded-xl border text-xs ${isDarkMode ? 'bg-luxury-gold/5 border-luxury-gold/20' : 'bg-yellow-50 border-yellow-200'}`}>
            <p className="text-luxury-gold font-semibold text-[10px] uppercase tracking-wider mb-0.5">Admin Notes</p>
            <p className={tp}>{app.adminNotes}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className={`border-t px-5 py-4 space-y-3 ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-100'}`}>
          {/* Real Government & Banking KYC Dossier */}
          <div className={`p-3.5 rounded-xl border space-y-2.5 ${isDarkMode ? 'bg-luxury-black/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold flex items-center gap-1.5">
                <FiShield size={12}/> Genuine KYC Verification Dossier
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kycData?.overallStatus === 'VERIFIED' ? CC.green : kycData?.overallStatus === 'NEEDS_REVIEW' ? CC.orange : CC.yellow}`}>
                {kycData?.overallStatus || 'PENDING'}
              </span>
            </div>

            {kycLoading ? (
              <p className={`text-xs ${ts} animate-pulse`}>Loading provider verification states…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>Phone (Firebase)</p>
                  <p className="font-bold text-xs mt-0.5 flex items-center gap-1">
                    {kycData?.phone?.status === 'VERIFIED' ? <span className="text-green-500">✓ VERIFIED</span> : <span className="text-yellow-500">○ PENDING</span>}
                  </p>
                  {kycData?.phone?.phoneMasked && <p className={`text-[10px] font-mono mt-0.5 ${ts}`}>{kycData.phone.phoneMasked}</p>}
                </div>
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>Aadhaar (Sub-AUA)</p>
                  <p className="font-bold text-xs mt-0.5 flex items-center gap-1">
                    {kycData?.aadhaar?.status === 'VERIFIED' ? <span className="text-green-500">✓ VERIFIED</span> : <span className="text-yellow-500">○ {kycData?.aadhaar?.status || 'PENDING'}</span>}
                  </p>
                  {kycData?.aadhaar?.aadhaarMasked && <p className={`text-[10px] font-mono mt-0.5 ${ts}`}>{kycData.aadhaar.aadhaarMasked}</p>}
                </div>
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>PAN (ITD Records)</p>
                  <p className="font-bold text-xs mt-0.5 flex items-center gap-1">
                    {kycData?.pan?.status === 'VERIFIED' ? <span className="text-green-500">✓ VERIFIED</span> : <span className="text-yellow-500">○ {kycData?.pan?.status || 'PENDING'}</span>}
                  </p>
                  {kycData?.pan?.panMasked && <p className={`text-[10px] font-mono mt-0.5 ${ts}`}>{kycData.pan.panMasked}</p>}
                </div>
                <div className={`p-2 rounded-lg border ${ib}`}>
                  <p className={`text-[10px] ${ts}`}>Bank (NPCI)</p>
                  <p className="font-bold text-xs mt-0.5 flex items-center gap-1">
                    {kycData?.bank?.status === 'VERIFIED' ? <span className="text-green-500">✓ VERIFIED</span> : <span className="text-yellow-500">○ {kycData?.bank?.status || 'PENDING'}</span>}
                  </p>
                  {kycData?.bank?.accountMasked && <p className={`text-[10px] font-mono mt-0.5 ${ts}`}>{kycData.bank.accountMasked}</p>}
                </div>
              </div>
            )}

            {kycData?.nameMatching && kycData.nameMatching.status !== 'UNAVAILABLE' && (
              <div className={`p-2 rounded-lg border text-[11px] ${kycData.nameMatching.status === 'MATCHED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : kycData.nameMatching.status === 'MISMATCH' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                <span className="font-bold">Identity Cross-Match: {kycData.nameMatching.status} ({kycData.nameMatching.averageScore}%) — </span>
                <span>{kycData.nameMatching.notes}</span>
              </div>
            )}
          </div>
          {(app.documents||[]).length > 0 && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${ts}`}>Documents</p>
              <div className="flex flex-wrap gap-2">
                {app.documents.map((doc,i) => (
                  <a key={i} href={doc.fileUrl} target="_blank" rel="noreferrer" className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 hover:border-luxury-gold transition-all ${ib} ${ts}`}>
                    <FiFileText size={11}/>
                    {doc.docType.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${doc.status==='VERIFIED'?CC.green:doc.status==='REJECTED'?CC.red:CC.yellow}`}>{doc.status}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {(app.auditLogs||[]).length > 0 && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${ts}`}>Audit Trail</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {[...app.auditLogs].reverse().map((log,i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${ib} border`}>
                    <FiShield size={11} className="text-luxury-gold mt-0.5 flex-shrink-0"/>
                    <div>
                      <span className="font-semibold text-luxury-gold">{log.action}</span>
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

      <div className={`border-t px-5 py-3 flex items-center justify-between gap-2 flex-wrap ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-100'}`}>
        <button onClick={() => setExpanded(e=>!e)} className={`text-xs font-semibold flex items-center gap-1 ${ts} hover:text-luxury-gold transition-colors`}>
          {expanded ? <FiChevronUp size={14}/> : <FiChevronDown size={14}/>}
          {expanded ? 'Collapse' : 'View Details'}
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {app.status === 'SUSPENDED' && (
            <button onClick={() => onAction(app,'REACTIVATE')} className="px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/25 text-xs font-bold rounded-xl hover:bg-green-500/20 transition-all flex items-center gap-1">
              <FiRotateCcw size={12}/> Reactivate
            </button>
          )}
          {app.status === 'APPROVED' && (
            <button onClick={() => onAction(app,'SUSPEND')} className="px-3 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/25 text-xs font-bold rounded-xl hover:bg-orange-500/20 transition-all flex items-center gap-1">
              <FiSlash size={12}/> Suspend
            </button>
          )}
          {!['APPROVED','REJECTED'].includes(app.status) && (
            <button onClick={() => onAction(app,'REQUEST_INFO')} className={`px-3 py-1.5 border text-xs font-bold rounded-xl transition-all flex items-center gap-1 ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'border-gray-300 text-gray-600'}`}>
              <FiAlertCircle size={12}/> Request Info
            </button>
          )}
          {app.status !== 'REJECTED' && (
            <button onClick={() => onAction(app,'REJECT')} className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/25 text-xs font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-1">
              <FiXCircle size={12}/> Reject
            </button>
          )}
          {app.status !== 'APPROVED' && (
            <button onClick={() => onAction(app,'APPROVE')} className="px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 shadow-md shadow-green-500/20 transition-all flex items-center gap-1">
              <FiCheckCircle size={12}/> Approve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminSellers() {
  const { isDarkMode } = useTheme()
  const [applications, setApplications] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sf, setSf]             = useState('ALL')
  const [rf, setRf]             = useState('ALL')
  const [modal, setModal]       = useState(null)

  const tp = isDarkMode ? 'text-white' : 'text-gray-900'
  const ts = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const cb = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const ib = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white placeholder-luxury-mediumGray' : 'bg-gray-50 border-gray-300 text-gray-900'

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (sf !== 'ALL') params.status = sf
      if (rf !== 'ALL') params.riskLevel = rf
      if (search.trim()) params.search = search.trim()
      const res = await adminService.getSellerApplications(params)
      if (res.data?.success) setApplications(res.data.applications || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load seller applications')
    } finally { setLoading(false) }
  }, [sf, rf, search])

  useEffect(() => { fetch() }, [fetch])

  const handleAction = (app, actionType) => {
    setModal({ app, actionType })
  }

  const confirmAction = async (id, actionType, notes) => {
    try {
      const res = await adminService.reviewSellerApplication(id, actionType, notes, notes)
      if (res.data?.success) {
        toast.success(res.data.message || `${actionType} successful`)
        setModal(null)
        fetch()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${actionType}`)
    }
  }

  const stats = {
    total:    applications.length,
    pending:  applications.filter(a=>['PENDING_REVIEW','SUBMITTED','UNDER_REVIEW'].includes(a.status)).length,
    approved: applications.filter(a=>a.status==='APPROVED').length,
    highRisk: applications.filter(a=>a.riskLevel==='HIGH_RISK').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {modal && <ActionModal app={modal.app} actionType={modal.actionType} isDarkMode={isDarkMode} onClose={()=>setModal(null)} onConfirm={confirmAction}/>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-2xl font-serif font-bold ${tp}`}>Seller Applications</h2>
          <p className={`text-sm mt-0.5 ${ts}`}>{applications.length} total applications</p>
        </div>
        <button onClick={fetch} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${isDarkMode ? 'border-luxury-darkGray text-luxury-mediumGray hover:text-white' : 'border-gray-300 text-gray-600'}`}>
          <FiRefreshCw size={13}/> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total',     value:stats.total,    cls:'text-luxury-mediumGray', Icon:FiBriefcase},
          {label:'Pending',   value:stats.pending,  cls:'text-yellow-500',        Icon:FiClock},
          {label:'Approved',  value:stats.approved, cls:'text-green-500',         Icon:FiCheckCircle},
          {label:'High Risk', value:stats.highRisk, cls:'text-red-500',           Icon:FiAlertTriangle},
        ].map(s=>(
          <div key={s.label} className={`rounded-xl border p-3.5 ${cb}`}>
            <div className="flex items-center gap-2"><s.Icon size={15} className={s.cls}/><span className={`text-xs font-semibold ${ts}`}>{s.label}</span></div>
            <p className={`text-2xl font-bold mt-1 ${tp}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border p-4 ${cb}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <FiSearch size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ts}`}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, shop, email…" className={`w-full pl-9 pr-3 py-2 border text-sm rounded-xl ${ib}`}/>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <FiFilter size={13} className={ts}/>
            {SF.map(s=>(
              <button key={s} onClick={()=>setSf(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sf===s?'bg-luxury-gold text-black border-luxury-gold':isDarkMode?'border-luxury-darkGray text-luxury-mediumGray hover:text-white':'border-gray-200 text-gray-500'}`}>
                {s==='ALL'?'All':STATUS_CONFIG[s]?.label||s}
              </button>
            ))}
          </div>
          <select value={rf} onChange={e=>setRf(e.target.value)} className={`py-2 px-3 rounded-xl border text-xs font-bold ${ib}`}>
            <option value="ALL">All Risk Levels</option>
            <option value="LOW_RISK">Low Risk</option>
            <option value="MEDIUM_RISK">Medium Risk</option>
            <option value="HIGH_RISK">High Risk</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : applications.length === 0 ? (
        <div className={`rounded-2xl border p-16 text-center ${cb}`}>
          <FiBriefcase size={40} className="mx-auto mb-3 text-luxury-gold opacity-30"/>
          <h3 className={`text-lg font-bold ${tp}`}>No Applications Found</h3>
          <p className={`text-xs mt-1 ${ts}`}>No seller applications match your current filters.</p>
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

