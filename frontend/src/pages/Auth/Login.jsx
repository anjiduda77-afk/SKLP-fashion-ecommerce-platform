import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { authService } from '@services/apiServices'
import { auth, RecaptchaVerifier, signInWithPhoneNumber, FIREBASE_CONFIGURED } from '../../config/firebase'
import { toast } from 'react-toastify'
import { 
  FiSmartphone, FiShield, FiLoader, 
  FiEdit2, FiCheckCircle, FiLock 
} from 'react-icons/fi'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 10 // seconds

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { isDarkMode } = useTheme()

  // Preserved destination after successful verification
  const redirectUrl = new URLSearchParams(location.search).get('redirect') || null

  // Flow step: 'phone' -> 'otp'
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpError, setOtpError] = useState('')
  
  const otpRefs = useRef([])
  const confirmationResultRef = useRef(null)
  const recaptchaVerifierRef = useRef(null)

  // Format mobile number for display: "+91 98765 43210"
  const formattedPhoneDisplay = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(-10)
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    }
    return `+91 ${digits}`
  }

  // ── Initialize RecaptchaVerifier Exactly Once in useEffect with StrictMode Guard ──
  useEffect(() => {
    let isMounted = true

    const initVerifier = () => {
      // Skip initialization if Firebase is not configured in this environment
      if (!FIREBASE_CONFIGURED || !auth) return
      if (typeof window === 'undefined') return
      
      // If already initialized in ref, reuse it
      if (recaptchaVerifierRef.current) return

      const container = document.getElementById('recaptcha-container')
      if (!container) return

      try {
        // Clear any leftover DOM nodes from previous mounts/StrictMode
        container.innerHTML = ''

        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved automatically by invisible mode
          },
          'expired-callback': () => {
            toast.warn('Security verification expired. Please try again.')
          }
        })

        if (isMounted) {
          recaptchaVerifierRef.current = verifier
        }
      } catch (err) {
        console.warn('Firebase RecaptchaVerifier initialization notice:', err.message)
      }
    }

    initVerifier()

    return () => {
      isMounted = false
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
        } catch (e) {
          // ignore
        }
        recaptchaVerifierRef.current = null
      }
      const container = document.getElementById('recaptcha-container')
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [])

  // 30s Countdown timer for resending OTP
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Redirect handler after verified login
  const handleRedirectAfterLogin = useCallback((userObj) => {
    const name = userObj?.firstName && userObj.firstName !== 'Customer' ? userObj.firstName : ''
    toast.success(`Welcome${name ? `, ${name}` : ''}! 🎉`)

    if (redirectUrl) {
      navigate(redirectUrl)
      return
    }

    const role = (userObj?.role || '').toLowerCase().trim()
    if (role === 'admin') {
      navigate('/admin/dashboard')
    } else if (role === 'seller') {
      navigate('/seller/dashboard')
    } else if (role === 'delivery' || role === 'deliverypartner') {
      navigate('/delivery/dashboard')
    } else {
      navigate('/')
    }
  }, [navigate, redirectUrl])

  // Handle phone input change (digits only, max 10)
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(val)
  }

  const isPhoneValid = /^[6-9][0-9]{9}$/.test(phone)

  // Helper to ensure RecaptchaVerifier is available
  const getOrCreateVerifier = () => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current
    }
    const container = document.getElementById('recaptcha-container')
    if (container) container.innerHTML = ''
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        toast.warn('Security verification expired. Please try again.')
      }
    })
    recaptchaVerifierRef.current = verifier
    return verifier
  }

  // ── Step 1: Request Real Firebase SMS OTP ───────────────────────────────────
  const handleSendOTP = async (e) => {
    e?.preventDefault()
    if (!isPhoneValid) {
      toast.error('Please enter a valid 10-digit Indian mobile number')
      return
    }

    // Guard: Firebase must be configured with real environment variables
    if (!FIREBASE_CONFIGURED || !auth) {
      toast.error('Firebase Phone Authentication is not configured for this environment. Please contact support.')
      return
    }

    setLoading(true)
    setOtpError('')
    try {
      // 1. Reuse existing single RecaptchaVerifier instance
      const appVerifier = getOrCreateVerifier()

      // 2. Format international E.164 phone number: +91XXXXXXXXXX
      const formattedE164 = `+91${phone}`

      // 3. Initiate Firebase Phone Authentication
      const confirmationResult = await signInWithPhoneNumber(auth, formattedE164, appVerifier)
      confirmationResultRef.current = confirmationResult

      setStep('otp')
      setCountdown(RESEND_COOLDOWN)
      setOtp(Array(OTP_LENGTH).fill(''))
      toast.success(`Real OTP SMS dispatched to ${formattedPhoneDisplay(phone)} via Firebase!`)
      setTimeout(() => otpRefs.current[0]?.focus(), 250)
    } catch (error) {
      console.error('Firebase Phone Auth Error:', error)
      let userMsg = 'Unable to send SMS OTP. Please try again later.'
      if (error.code === 'auth/invalid-phone-number') {
        userMsg = 'Invalid phone number format.'
      } else if (error.code === 'auth/quota-exceeded') {
        userMsg = 'SMS quota reached. Please try again later.'
      } else if (error.code === 'auth/too-many-requests') {
        userMsg = 'Too many attempts. Please wait a few moments.'
      } else if (error.code === 'auth/captcha-check-failed') {
        userMsg = 'Security verification failed. Please refresh and try again.'
      } else if (error.message) {
        userMsg = error.message
      }
      toast.error(userMsg)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: OTP Input Handlers ──────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setOtpError('')

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus()
      } else {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      setOtp(pasted.split(''))
      otpRefs.current[OTP_LENGTH - 1]?.focus()
    }
  }

  // ── Step 3: Verify Firebase OTP & Exchange for Application JWT ──────────────
  const handleVerifyOTP = async (e) => {
    e?.preventDefault()
    const otpString = otp.join('')
    if (otpString.length < OTP_LENGTH) {
      setOtpError('Please enter the complete 6-digit OTP')
      return
    }

    if (!confirmationResultRef.current) {
      setOtpError('Verification session expired. Please request a new OTP.')
      return
    }

    setOtpLoading(true)
    setOtpError('')
    try {
      // 1. Confirm OTP with Firebase Client SDK
      const userCredential = await confirmationResultRef.current.confirm(otpString)
      
      // 2. Obtain cryptographically signed Firebase ID Token
      const firebaseIdToken = await userCredential.user.getIdToken()

      // 3. Authenticate with Node.js backend using verified Firebase ID Token
      const res = await authService.firebaseLogin(firebaseIdToken)

      if (res.data?.success && res.data?.token) {
        const { user: userObj, token: authToken, refreshToken } = res.data
        login(userObj, authToken, refreshToken)
        handleRedirectAfterLogin(userObj)
      } else {
        throw new Error(res.data?.message || 'Authentication failed on server')
      }
    } catch (error) {
      console.error('Firebase OTP Verification Error:', error)
      let msg = 'Invalid or expired OTP. Please try again.'
      if (error.code === 'auth/invalid-verification-code') {
        msg = 'Incorrect 6-digit OTP. Please check your SMS and try again.'
      } else if (error.code === 'auth/code-expired') {
        msg = 'This OTP has expired. Please click Resend OTP.'
      } else if (error.response?.data?.message) {
        msg = error.response.data.message
      }
      setOtpError(msg)
      toast.error(msg)
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (countdown > 0 || otpLoading) return
    try {
      const appVerifier = getOrCreateVerifier()
      const formattedE164 = `+91${phone}`
      const confirmationResult = await signInWithPhoneNumber(auth, formattedE164, appVerifier)
      confirmationResultRef.current = confirmationResult

      setCountdown(RESEND_COOLDOWN)
      setOtp(Array(OTP_LENGTH).fill(''))
      setOtpError('')
      toast.success(`New OTP SMS sent to ${formattedPhoneDisplay(phone)}`)
      otpRefs.current[0]?.focus()
    } catch (error) {
      console.error('Firebase Resend Error:', error)
      toast.error(error.message || 'Failed to resend OTP. Please try again.')
    }
  }

  // Card & theme styles
  const cardBg = isDarkMode
    ? 'bg-[#0e0e0e]/95 border-white/10 text-white shadow-[0_12px_45px_rgba(0,0,0,0.6)]'
    : 'bg-white/95 border-gray-200/80 text-gray-900 shadow-[0_12px_45px_rgba(0,0,0,0.06)]'

  const inputClass = `w-full text-sm py-4 rounded-2xl focus:ring-2 focus:ring-amber-400/50 outline-none bg-transparent border transition-all duration-200 ${
    isDarkMode
      ? 'border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/50'
      : 'border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500/50'
  }`

  const primaryBtn = 'w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]'

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      {/* Exactly single container for Firebase reCAPTCHA */}
      <div id="recaptcha-container"></div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className={`p-8 md:p-10 rounded-3xl border backdrop-blur-xl ${cardBg}`}>
          {/* Header Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3 font-serif font-black text-xl">
              S
            </div>
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-amber-500">
              SKLP Fashion
            </h2>
            <h1 className="text-2xl font-serif font-bold tracking-tight mt-1">
              {step === 'phone' ? 'Mobile Sign In' : 'Verify Mobile OTP'}
            </h1>
            <p className="text-xs opacity-65 mt-1.5 leading-relaxed">
              {step === 'phone'
                ? 'Enter your 10-digit mobile number to receive a real SMS OTP.'
                : `Enter the 6-digit OTP sent to ${formattedPhoneDisplay(phone)}`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* ── STEP 1: MOBILE NUMBER INPUT ── */}
            {step === 'phone' && (
              <motion.form
                key="phone-step"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSendOTP}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-75">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    {/* Country Code Pill */}
                    <div className={`flex items-center gap-1.5 px-3.5 py-3.5 rounded-l-2xl border-y border-l text-xs font-bold ${
                      isDarkMode
                        ? 'border-white/15 bg-white/5 text-amber-400'
                        : 'border-gray-200 bg-gray-50 text-amber-600'
                    }`}>
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>

                    {/* Phone Input */}
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Enter 10-digit mobile number"
                      className={`${inputClass} rounded-l-none pl-3 font-semibold tracking-wider`}
                      autoFocus
                      required
                    />
                  </div>
                  {phone.length > 0 && !isPhoneValid && (
                    <p className="text-[11px] text-amber-500 mt-1.5 font-medium">
                      Please enter a valid 10-digit Indian number starting with 6, 7, 8, or 9
                    </p>
                  )}
                </div>

                {/* Submit / Get OTP Button */}
                <button
                  type="submit"
                  disabled={!isPhoneValid || loading}
                  className={primaryBtn}
                >
                  {loading ? (
                    <>
                      <FiLoader size={16} className="animate-spin" /> Requesting SMS OTP...
                    </>
                  ) : (
                    'CONTINUE'
                  )}
                </button>

                {/* Terms of Service Notice */}
                <p className="text-[11px] text-center opacity-60 leading-relaxed pt-2">
                  By continuing, you agree to SKLP Fashion's{' '}
                  <span className="text-amber-500 underline cursor-pointer">Terms of Service</span> and{' '}
                  <span className="text-amber-500 underline cursor-pointer">Privacy Policy</span>.
                </p>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-bold text-amber-500/80">
                  <FiShield size={13} />
                  <span>Google Firebase Verified Real SMS Authentication</span>
                </div>
              </motion.form>
            )}

            {/* ── STEP 2: 6-DIGIT OTP VERIFICATION ── */}
            {step === 'otp' && (
              <motion.form
                key="otp-step"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                {/* Change Phone Button */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-current/10 text-xs">
                  <div className="flex items-center gap-2 font-mono font-bold">
                    <FiSmartphone className="text-amber-500" />
                    <span>{formattedPhoneDisplay(phone)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone')
                      setOtp(Array(OTP_LENGTH).fill(''))
                      setOtpError('')
                    }}
                    className="flex items-center gap-1 font-bold text-amber-500 hover:underline"
                  >
                    <FiEdit2 size={12} /> Change Number
                  </button>
                </div>

                {/* 6 OTP Input Boxes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-75 text-center">
                    Enter 6-Digit SMS OTP
                  </label>
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className={`w-12 h-14 text-center text-xl font-bold font-mono rounded-2xl border outline-none transition-all duration-200 ${
                          isDarkMode
                            ? 'border-white/15 bg-white/5 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40'
                            : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40'
                        } ${otpError ? 'border-red-500 text-red-500' : ''}`}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="text-xs text-red-400 text-center font-medium mt-3">
                      {otpError}
                    </p>
                  )}
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={otp.join('').length < OTP_LENGTH || otpLoading}
                  className={primaryBtn}
                >
                  {otpLoading ? (
                    <>
                      <FiLoader size={16} className="animate-spin" /> Verifying with Firebase...
                    </>
                  ) : (
                    'VERIFY OTP'
                  )}
                </button>

                {/* Resend OTP & Timer */}
                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <p className="text-xs opacity-65 font-medium">
                      Resend OTP in{' '}
                      <span className="text-amber-500 font-bold font-mono">
                        00:{countdown < 10 ? `0${countdown}` : countdown}
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-xs font-bold text-amber-500 hover:underline uppercase tracking-wider"
                    >
                      RESEND OTP
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
