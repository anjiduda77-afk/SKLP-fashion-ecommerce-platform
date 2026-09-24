import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FiCheckCircle, FiClock, FiAlertCircle,
  FiPhone, FiFileText, FiCreditCard, FiCheck, FiSend
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../../config/firebase'
import kycService from '../../services/kycService'

export default function SellerKycProgress({ isDarkMode, formData, setFormData, onKycUpdated }) {
  const [kycData, setKycData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState({})

  // Phone OTP Flow State
  const [phoneStep, setPhoneStep] = useState(1) // 1: input/send, 2: enter otp
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [confirmResult, setConfirmResult] = useState(null)
  const recaptchaVerifierRef = useRef(null)

  // Aadhaar Flow State
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [aadhaarConsent, setAadhaarConsent] = useState(false)
  const [aadhaarRefId, setAadhaarRefId] = useState(null)
  const [aadhaarOtp, setAadhaarOtp] = useState('')
  const [aadhaarStep, setAadhaarStep] = useState(1) // 1: enter Aadhaar, 2: enter OTP
  const [aadhaarLoading, setAadhaarLoading] = useState(false)

  // PAN Flow State
  const [panLoading, setPanLoading] = useState(false)

  // Bank Flow State
  const [bankLoading, setBankLoading] = useState(false)

  const cardBg = isDarkMode ? 'bg-luxury-black/60 border-luxury-darkGray' : 'bg-gray-50 border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const inputBg = isDarkMode ? 'bg-luxury-black border-luxury-darkGray text-white' : 'bg-white border-gray-300 text-gray-900'

  const fetchKyc = useCallback(async () => {
    try {
      setLoading(true)
      const res = await kycService.getMyKycStatus()
      if (res.data?.success) {
        setKycData(res.data.kyc)
        setProviders(res.data.providersConfigured || {})
        if (onKycUpdated) onKycUpdated(res.data.kyc)
      }
    } catch (err) {
      console.warn('KYC status load note:', err.message)
    } finally {
      setLoading(false)
    }
  }, [onKycUpdated])

  useEffect(() => {
    fetchKyc()
    return () => {
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear() } catch (_e) { /* ignore */ }
      }
    }
  }, [fetchKyc])

  // ── 1. Phone Verification via Real Firebase SMS OTP ─────────────────────────
  const handleSendPhoneOtp = async () => {
    const raw = formData.phone || ''
    const digits = raw.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setPhoneLoading(true)
    const e164 = `+91${digits}`

    try {
      if (!auth) throw new Error('Firebase authentication is not initialized')

      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'kyc-recaptcha-container', {
          size: 'invisible',
          callback: () => {}
        })
      }

      const confirmation = await signInWithPhoneNumber(auth, e164, recaptchaVerifierRef.current)
      setConfirmResult(confirmation)
      setPhoneStep(2)
      toast.success(`SMS verification code dispatched to ${e164}`)
    } catch (err) {
      console.error('[KYC Phone] Send OTP failed:', err)
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear() } catch (_e) { /* ignore */ }
        recaptchaVerifierRef.current = null
      }
      toast.error(err.message || 'Failed to dispatch SMS verification code.')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyPhoneOtp = async () => {
    const cleanOtp = phoneOtp.trim()
    if (!cleanOtp || cleanOtp.length < 6) {
      toast.error('Please enter the 6-digit SMS verification code')
      return
    }
    if (!confirmResult) {
      toast.error('Verification session expired. Please resend code.')
      setPhoneStep(1)
      return
    }

    setPhoneLoading(true)
    try {
      const credential = await confirmResult.confirm(cleanOtp)
      const idToken = await credential.user.getIdToken(true)

      const res = await kycService.verifyPhone(idToken, formData.phone)
      if (res.data?.success) {
        toast.success('Mobile number verified successfully via Firebase!')
        setPhoneStep(1)
        fetchKyc()
      } else {
        toast.error(res.data?.message || 'Phone verification failed on server.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid SMS verification code.')
    } finally {
      setPhoneLoading(false)
    }
  }

  // ── 2. Aadhaar Verification via Genuine Sub-AUA Provider ───────────────────
  const handleStartAadhaar = async () => {
    if (!aadhaarConsent) {
      toast.error('Explicit consent is required for Aadhaar verification.')
      return
    }
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '')
    if (cleanAadhaar.length !== 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number.')
      return
    }

    setAadhaarLoading(true)
    try {
      const res = await kycService.startAadhaar(cleanAadhaar, true)
      if (res.data?.success && res.data.refId) {
        setAadhaarRefId(res.data.refId)
        setAadhaarStep(2)
        toast.success('Aadhaar OTP dispatched by UIDAI authorized provider!')
      } else {
        toast.info(res.data?.message || 'Verification provider responded.')
        fetchKyc()
      }
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.message || 'Aadhaar verification service error.'
      if (status === 503) {
        toast.warn(msg)
      } else {
        toast.error(msg)
      }
      fetchKyc()
    } finally {
      setAadhaarLoading(false)
    }
  }

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp || aadhaarOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit Aadhaar OTP.')
      return
    }

    setAadhaarLoading(true)
    try {
      const res = await kycService.verifyAadhaarOtp(aadhaarRefId, aadhaarOtp.trim(), true)
      if (res.data?.success) {
        toast.success('Aadhaar verified successfully with UIDAI authorized records!')
        setAadhaarStep(1)
        fetchKyc()
      } else {
        toast.error(res.data?.message || 'Aadhaar OTP verification failed.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid Aadhaar OTP.')
    } finally {
      setAadhaarLoading(false)
    }
  }

  // ── 3. PAN Verification via Real ITD Provider ──────────────────────────────
  const handleVerifyPan = async () => {
    const cleanPan = (formData.panNumber || '').trim().toUpperCase()
    if (!cleanPan || cleanPan.length !== 10) {
      toast.error('Please enter a valid 10-character PAN number.')
      return
    }

    setPanLoading(true)
    try {
      const res = await kycService.verifyPan(cleanPan, formData.applicantName)
      if (res.data?.success) {
        toast.success('PAN verified successfully with Income Tax Department records!')
      } else if (res.data?.status === 'NEEDS_REVIEW') {
        toast.warn(res.data.message)
      } else {
        toast.info(res.data?.message || 'PAN verification update.')
      }
      fetchKyc()
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.message || 'PAN verification provider error.'
      if (status === 503) {
        toast.warn(msg)
      } else {
        toast.error(msg)
      }
      fetchKyc()
    } finally {
      setPanLoading(false)
    }
  }

  // ── 4. Bank Account Verification via Real NPCI Provider ────────────────────
  const handleVerifyBank = async () => {
    const cleanAcc = (formData.accountNumber || '').replace(/\D/g, '')
    const cleanIfsc = (formData.ifscCode || '').trim().toUpperCase()
    if (!cleanAcc || cleanAcc.length < 9) {
      toast.error('Please enter a valid bank account number.')
      return
    }
    if (!cleanIfsc || cleanIfsc.length !== 11) {
      toast.error('Please enter a valid 11-character IFSC code.')
      return
    }

    setBankLoading(true)
    try {
      const res = await kycService.verifyBank(cleanAcc, cleanIfsc, formData.accountName)
      if (res.data?.success) {
        toast.success('Bank account verified successfully with the banking network!')
      } else if (res.data?.status === 'NEEDS_REVIEW') {
        toast.warn(res.data.message)
      } else {
        toast.info(res.data?.message || 'Bank verification update.')
      }
      fetchKyc()
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.message || 'Bank verification provider error.'
      if (status === 503) {
        toast.warn(msg)
      } else {
        toast.error(msg)
      }
      fetchKyc()
    } finally {
      setBankLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`p-6 rounded-2xl border ${cardBg} text-center space-y-2`}>
        <div className="w-6 h-6 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className={`text-xs ${textSecondary}`}>Loading KYC compliance state…</p>
      </div>
    )
  }

  const phoneStatus = kycData?.phone?.status || 'PENDING'
  const aadhaarStatus = kycData?.aadhaar?.status || 'PENDING'
  const panStatus = kycData?.pan?.status || 'PENDING'
  const bankStatus = kycData?.bank?.status || 'PENDING'

  const verifiedCount = [phoneStatus, aadhaarStatus, panStatus, bankStatus].filter(s => s === 'VERIFIED').length

  const renderBadge = (status, maskedValue) => {
    if (status === 'VERIFIED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
          <FiCheck size={11} /> VERIFIED {maskedValue ? `(${maskedValue})` : ''}
        </span>
      )
    }
    if (status === 'NEEDS_REVIEW') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
          <FiAlertCircle size={11} /> NEEDS REVIEW
        </span>
      )
    }
    if (status === 'FAILED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
          <FiAlertCircle size={11} /> FAILED
        </span>
      )
    }
    if (status === 'NOT_CONFIGURED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1">
          <FiClock size={11} /> NOT CONFIGURED
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 flex items-center gap-1">
        <FiClock size={11} /> PENDING
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hidden container for invisible reCAPTCHA */}
      <div id="kyc-recaptcha-container" />

      {/* KYC Progress Overview Header */}
      <div className={`p-4 rounded-2xl border ${cardBg} flex items-center justify-between flex-wrap gap-3`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-luxury-gold">Seller Compliance KYC</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 font-bold">
              {verifiedCount} / 4 Verified
            </span>
          </div>
          <p className={`text-[11px] mt-0.5 ${textSecondary}`}>
            Direct verification through government-authorized and banking identity providers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${kycData?.overallStatus === 'VERIFIED' ? 'text-green-500' : 'text-luxury-gold'}`}>
            Overall: {kycData?.overallStatus || 'IN_PROGRESS'}
          </span>
        </div>
      </div>

      {/* Grid of 4 Verification Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 1. Phone Verification (Firebase SMS OTP) */}
        <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center text-luxury-gold">
                <FiPhone size={14} />
              </div>
              <div>
                <h4 className={`text-xs font-bold ${textPrimary}`}>1. Phone Verification</h4>
                <p className={`text-[10px] ${textSecondary}`}>Real Firebase SMS OTP</p>
              </div>
            </div>
            {renderBadge(phoneStatus, kycData?.phone?.phoneMasked)}
          </div>

          {phoneStatus !== 'VERIFIED' && (
            <div className="space-y-2 pt-1 border-t border-white/5">
              {phoneStep === 1 ? (
                <div className="space-y-2">
                  <p className={`text-[11px] ${textSecondary}`}>
                    Phone: <strong className={textPrimary}>{formData.phone || 'Not provided'}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={phoneLoading || !formData.phone}
                    className="w-full py-2 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {phoneLoading ? 'Sending SMS OTP…' : 'Send Firebase SMS OTP'} <FiSend size={11} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit SMS OTP"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-mono tracking-widest text-center ${inputBg}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPhoneStep(1)}
                      className={`flex-1 py-1.5 border text-xs rounded-xl ${isDarkMode ? 'border-luxury-darkGray text-gray-300' : 'border-gray-200'}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOtp}
                      disabled={phoneLoading || phoneOtp.length < 6}
                      className="flex-1 py-1.5 bg-green-500 text-white font-bold text-xs rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      {phoneLoading ? 'Verifying…' : 'Verify Code'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Aadhaar Verification (Real Sub-AUA Provider) */}
        <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center text-luxury-gold">
                <FiFileText size={14} />
              </div>
              <div>
                <h4 className={`text-xs font-bold ${textPrimary}`}>2. Aadhaar Verification</h4>
                <p className={`text-[10px] ${textSecondary}`}>UIDAI Compliant Sub-AUA</p>
              </div>
            </div>
            {renderBadge(aadhaarStatus, kycData?.aadhaar?.aadhaarMasked)}
          </div>

          {aadhaarStatus !== 'VERIFIED' && (
            <div className="space-y-2 pt-1 border-t border-white/5">
              {!providers.aadhaar && (
                <p className="text-[10px] text-amber-500 font-medium">
                  Notice: Aadhaar verification service is not configured on this server. Provider credentials required in production.
                </p>
              )}

              {aadhaarStep === 1 ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="Enter 12-digit Aadhaar number"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-mono tracking-wider ${inputBg}`}
                  />
                  <label className="flex items-start gap-2 cursor-pointer text-[10px] text-luxury-mediumGray select-none">
                    <input
                      type="checkbox"
                      checked={aadhaarConsent}
                      onChange={(e) => setAadhaarConsent(e.target.checked)}
                      className="mt-0.5 rounded border-gray-400 text-luxury-gold focus:ring-luxury-gold"
                    />
                    <span>I consent to Aadhaar-based identity verification for seller KYC.</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleStartAadhaar}
                    disabled={aadhaarLoading || aadhaarNumber.length !== 12 || !aadhaarConsent}
                    className="w-full py-2 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50"
                  >
                    {aadhaarLoading ? 'Connecting Provider…' : 'Initiate Aadhaar KYC'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit Aadhaar OTP"
                    value={aadhaarOtp}
                    onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-mono tracking-widest text-center ${inputBg}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAadhaarStep(1)}
                      className={`flex-1 py-1.5 border text-xs rounded-xl ${isDarkMode ? 'border-luxury-darkGray text-gray-300' : 'border-gray-200'}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyAadhaarOtp}
                      disabled={aadhaarLoading || aadhaarOtp.length < 6}
                      className="flex-1 py-1.5 bg-green-500 text-white font-bold text-xs rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      {aadhaarLoading ? 'Submitting OTP…' : 'Verify Aadhaar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. PAN Verification (Real Income Tax Provider) */}
        <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center text-luxury-gold">
                <FiCreditCard size={14} />
              </div>
              <div>
                <h4 className={`text-xs font-bold ${textPrimary}`}>3. PAN Card Verification</h4>
                <p className={`text-[10px] ${textSecondary}`}>Income Tax Dept Records</p>
              </div>
            </div>
            {renderBadge(panStatus, kycData?.pan?.panMasked)}
          </div>

          {panStatus !== 'VERIFIED' && (
            <div className="space-y-2 pt-1 border-t border-white/5">
              {!providers.pan && (
                <p className="text-[10px] text-amber-500 font-medium">
                  Notice: PAN verification service is not configured on this server. Provider credentials required in production.
                </p>
              )}
              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Enter 10-char PAN (e.g. ABCDE1234F)"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-mono uppercase ${inputBg}`}
                />
                <button
                  type="button"
                  onClick={handleVerifyPan}
                  disabled={panLoading || (formData.panNumber || '').length !== 10}
                  className="w-full py-2 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50"
                >
                  {panLoading ? 'Checking Tax Records…' : 'Verify PAN via ITD Provider'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Bank Account Verification (Real NPCI / Penny Drop Provider) */}
        <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center text-luxury-gold">
                <FiCreditCard size={14} />
              </div>
              <div>
                <h4 className={`text-xs font-bold ${textPrimary}`}>4. Bank Account Verification</h4>
                <p className={`text-[10px] ${textSecondary}`}>NPCI / Banking Network</p>
              </div>
            </div>
            {renderBadge(bankStatus, kycData?.bank?.accountMasked)}
          </div>

          {bankStatus !== 'VERIFIED' && (
            <div className="space-y-2 pt-1 border-t border-white/5">
              {!providers.bank && (
                <p className="text-[10px] text-amber-500 font-medium">
                  Notice: Bank verification service is not configured on this server. Provider credentials required in production.
                </p>
              )}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono ${inputBg}`}
                  />
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="IFSC Code"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono uppercase ${inputBg}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyBank}
                  disabled={bankLoading || !(formData.accountNumber && formData.ifscCode)}
                  className="w-full py-2 bg-luxury-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50"
                >
                  {bankLoading ? 'Verifying with Bank…' : 'Verify Account via NPCI Provider'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Name Matching Consistency Card if checked */}
      {kycData?.nameMatching && kycData.nameMatching.status !== 'UNAVAILABLE' && (
        <div className={`p-3.5 rounded-xl border text-xs ${
          kycData.nameMatching.status === 'MATCHED'
            ? 'bg-green-500/5 border-green-500/20 text-green-600'
            : kycData.nameMatching.status === 'PARTIAL_MATCH'
            ? 'bg-amber-500/5 border-amber-500/20 text-amber-500'
            : 'bg-red-500/5 border-red-500/20 text-red-500'
        }`}>
          <div className="flex items-center gap-1.5 font-bold">
            <FiCheckCircle size={13} />
            <span>Identity Name Cross-Match: {kycData.nameMatching.status} ({kycData.nameMatching.averageScore}%)</span>
          </div>
          <p className="text-[11px] mt-0.5 opacity-90">{kycData.nameMatching.notes}</p>
        </div>
      )}
    </div>
  )
}
