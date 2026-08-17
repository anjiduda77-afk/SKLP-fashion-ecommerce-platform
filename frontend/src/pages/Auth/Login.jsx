import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { authService, userService } from '@services/apiServices'
import { toast } from 'react-toastify'
import { 
  FiMail, FiLock, FiEye, FiEyeOff, 
  FiSmartphone, FiShield, FiSun, FiMoon, FiGlobe, FiCheckCircle, FiArrowLeft,
  FiChevronRight, FiLoader, FiUser
} from 'react-icons/fi'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const OTP_LENGTH = 6
const RESEND_COOLDOWN = 10 // seconds

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { isDarkMode, toggleTheme, language, changeLanguage } = useTheme()
  
  // Destination after login
  const redirectUrl = new URLSearchParams(location.search).get('redirect') || null

  // ─── STEP FLOW ─────────────────────────────────────────────────────────────
  // 'main'     → Google + Mobile Number input (Flipkart-style simplicity)
  // 'otp'      → enter 6-digit OTP
  // 'name'     → optional brief name setup if brand new OTP user
  // 'email'    → traditional email + password login
  const [step, setStep] = useState('main')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Phone OTP state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [otpLoading, setOtpLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState(false)
  const otpRefs = useRef([])

  // New user onboarding state (after OTP)
  const [newUserData, setNewUserData] = useState({ firstName: '', lastName: '' })

  // Email state
  const [emailData, setEmailData] = useState({ email: '', password: '' })

  // ─── TRANSLATIONS ──────────────────────────────────────────────────────────
  const translations = {
    en: {
      welcome: 'Welcome to SKLP Fashion',
      subtitle: 'Sign in to access your orders, cart & wishlist',
      continueGoogle: 'Continue with Google',
      orText: 'OR',
      phoneLabel: 'Mobile Number',
      phonePlaceholder: 'Enter 10-digit mobile number',
      getOtp: 'Continue with OTP',
      otpTitle: 'Verify Mobile Number',
      otpDesc: 'Enter the 6-digit verification code sent to',
      verifyOtp: 'Verify & Sign In',
      changeNumber: 'Change number',
      resendOtp: 'Resend OTP',
      resendIn: 'Resend in',
      emailOption: 'Login with Email & Password',
      emailLabel: 'Email Address',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In',
      forgotPassword: 'Forgot Password?',
      noAccount: "New to SKLP Fashion?",
      signUp: 'Create Account',
      signing: 'Signing in...',
      sendingOtp: 'Sending OTP...',
      verifying: 'Verifying...',
      backToLogin: 'Back to phone login',
      otpSent: 'OTP sent successfully!',
      otpVerified: 'Verified successfully! Welcome!',
      otpExpired: 'OTP expired. Please request a new OTP.',
      invalidOtp: 'Invalid OTP. Please try again.',
      secureLogin: '100% Safe & Secure Authentication',
      welcomeNewUser: 'Welcome to SKLP!',
      namePrompt: 'Please tell us your name to personalize your experience',
      firstName: 'First Name',
      lastName: 'Last Name',
      completeSetup: 'Complete & Continue'
    },
    te: {
      welcome: 'SKLP ఫ్యాషన్‌కి స్వాగతం',
      subtitle: 'మీ ఆర్డర్‌లు & కార్ట్‌ను యాక్సెస్ చేయడానికి సైన్ ఇన్ చేయండి',
      continueGoogle: 'Google తో కొనసాగించండి',
      orText: 'లేదా',
      phoneLabel: 'మొబైల్ నంబర్',
      phonePlaceholder: '10 అంకెల మొబైల్ నంబర్',
      getOtp: 'OTP తో కొనసాగించండి',
      otpTitle: 'మొబైల్ నంబర్ ధృవీకరణ',
      otpDesc: 'పంపిన 6-అంకెల కోడ్ నమోదు చేయండి',
      verifyOtp: 'ధృవీకరించి సైన్ ఇన్ చేయండి',
      changeNumber: 'నంబర్ మార్చండి',
      resendOtp: 'OTP మళ్ళీ పంపండి',
      resendIn: 'మళ్ళీ పంపు',
      emailOption: 'ఇమెయిల్ & పాస్‌వర్డ్‌తో లాగిన్ చేయండి',
      emailLabel: 'ఇమెయిల్ చిరునామా',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'పాస్‌వర్డ్',
      passwordPlaceholder: 'పాస్‌వర్డ్ నమోదు చేయండి',
      signIn: 'సైన్ ఇన్',
      forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?',
      noAccount: 'SKLP కి కొత్తవారా?',
      signUp: 'ఖాతా సృష్టించండి',
      signing: 'సైన్ ఇన్ అవుతోంది...',
      sendingOtp: 'OTP పంపుతోంది...',
      verifying: 'ధృవీకరిస్తోంది...',
      backToLogin: 'ఫోన్ లాగిన్‌కి తిరిగి వెళ్ళండి',
      otpSent: 'OTP విజయవంతంగా పంపబడింది!',
      otpVerified: 'ధృవీకరించబడింది! స్వాగతం!',
      otpExpired: 'OTP గడువు ముగిసింది. దయచేసి కొత్త OTP అభ్యర్థించండి.',
      invalidOtp: 'చెల్లని OTP. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      secureLogin: '100% సురక్షితమైన లాగిన్',
      welcomeNewUser: 'SKLP కి స్వాగతం!',
      namePrompt: 'దయచేసి మీ పేరు నమోదు చేయండి',
      firstName: 'మొదటి పేరు',
      lastName: 'చివరి పేరు',
      completeSetup: 'పూర్తి చేసి కొనసాగండి'
    },
    hi: {
      welcome: 'SKLP फैशन में आपका स्वागत है',
      subtitle: 'ऑर्डर, कार्ट और विशलिस्ट एक्सेस करने के लिए साइन इन करें',
      continueGoogle: 'Google के साथ जारी रखें',
      orText: 'या',
      phoneLabel: 'मोबाइल नंबर',
      phonePlaceholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
      getOtp: 'OTP के साथ जारी रखें',
      otpTitle: 'मोबाइल नंबर सत्यापित करें',
      otpDesc: 'भेजा गया 6-अंकों का कोड दर्ज करें',
      verifyOtp: 'सत्यापित करें और साइन इन करें',
      changeNumber: 'नंबर बदलें',
      resendOtp: 'OTP दोबारा भेजें',
      resendIn: 'दोबारा भेजें',
      emailOption: 'ईमेल और पासवर्ड से लॉगिन करें',
      emailLabel: 'ईमेल पता',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'पासवर्ड',
      passwordPlaceholder: 'पासवर्ड दर्ज करें',
      signIn: 'साइन इन',
      forgotPassword: 'पासवर्ड भूल गए?',
      noAccount: 'SKLP में नए हैं?',
      signUp: 'खाता बनाएं',
      signing: 'साइन इन हो रहा है...',
      sendingOtp: 'OTP भेजा जा रहा है...',
      verifying: 'सत्यापित हो रहा है...',
      backToLogin: 'फ़ोन लॉगिन पर वापस जाएं',
      otpSent: 'OTP सफलतापूर्वक भेजा गया!',
      otpVerified: 'सत्यापित हो गया! स्वागत है!',
      otpExpired: 'OTP समाप्त हो गया। कृपया नया OTP प्राप्त करें।',
      invalidOtp: 'अमान्य OTP। कृपया पुनः प्रयास करें।',
      secureLogin: '100% सुरक्षित लॉगिन',
      welcomeNewUser: 'SKLP में आपका स्वागत है!',
      namePrompt: 'कृपया अपना नाम दर्ज करें',
      firstName: 'पहला नाम',
      lastName: 'अंतिम नाम',
      completeSetup: 'पूर्ण करें और जारी रखें'
    }
  }

  const t = translations[language] || translations.en

  // ─── COUNTDOWN TIMER ───────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // ─── ROLE REDIRECT ─────────────────────────────────────────────────────────
  const handleRoleRedirect = useCallback((userObj) => {
    const role = (userObj?.role || '').toLowerCase().replace(/\s+/g, '').trim()
    const name = userObj?.firstName && userObj.firstName !== 'Customer' ? userObj.firstName : ''
    toast.success(`Welcome${name ? `, ${name}` : ''}! 🎉`)

    if (redirectUrl) {
      navigate(redirectUrl)
      return
    }

    const roleMap = {
      'admin': '/admin/dashboard',
      'seller': '/seller/dashboard',
      'delivery': '/delivery/dashboard',
      'deliverypartner': '/delivery/dashboard',
      'customer': '/',
      'user': '/'
    }
    navigate(roleMap[role] || '/')
  }, [navigate, redirectUrl])

  // ─── REAL GOOGLE OAUTH FLOW ────────────────────────────────────────────────
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const isGoogleConfigured = Boolean(googleClientId && googleClientId.includes('.apps.googleusercontent.com'))

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      try {
        const response = await authService.googleLogin(tokenResponse.access_token)
        if (response.data?.success && response.data?.user) {
          await login(response.data.user, response.data.token, response.data.refreshToken)
          handleRoleRedirect(response.data.user)
        }
      } catch (error) {
        console.error('Google login failed:', error)
        toast.error(error?.response?.data?.message || 'Google sign-in failed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    onError: (error) => {
      console.warn('Google OAuth prompt error:', error)
      toast.error('Google authentication was cancelled or could not be completed.')
    }
  })

  const handleGoogleClick = async () => {
    if (isGoogleConfigured) {
      // Production Real Google OAuth
      triggerGoogleLogin()
      return
    }

    if (import.meta.env.DEV) {
      // Development sandbox mode when VITE_GOOGLE_CLIENT_ID is not configured
      setLoading(true)
      try {
        const response = await authService.googleLogin('demo_google_customer@sklp-fashion.com')
        if (response.data?.success && response.data?.user) {
          await login(response.data.user, response.data.token, response.data.refreshToken)
          toast.info('Signed in via Google Sandbox (Dev Mode). Add VITE_GOOGLE_CLIENT_ID for Real Google OAuth.')
          handleRoleRedirect(response.data.user)
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Google login failed')
      } finally {
        setLoading(false)
      }
      return
    }

  }

  // ─── SEND MOBILE OTP ───────────────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e?.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '')
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number')
      return
    }
    setOtpLoading(true)
    setOtpError('')
    try {
      await authService.sendOTP(cleanPhone)
      setStep('otp')
      setCountdown(RESEND_COOLDOWN)
      setOtp(Array(OTP_LENGTH).fill(''))
      toast.success(t.otpSent)
      setTimeout(() => otpRefs.current[0]?.focus(), 200)
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send OTP. Please try again.'
      toast.error(msg)
    } finally {
      setOtpLoading(false)
    }
  }

  // ─── OTP INPUT HANDLERS ────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setOtpError('')
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
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

  // ─── VERIFY OTP ────────────────────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e?.preventDefault()
    const otpString = otp.join('')
    if (otpString.length < OTP_LENGTH) {
      setOtpError('Please enter the complete 6-digit OTP')
      return
    }
    setLoading(true)
    setOtpError('')
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      const response = await authService.verifyOTP(cleanPhone, otpString)
      setOtpSuccess(true)
      await login(response.data.user, response.data.token, response.data.refreshToken)

      // If new customer with placeholder name, give them a chance to set their name
      if (response.data.isNewUser || response.data.user?.firstName === 'Customer') {
        setTimeout(() => setStep('name'), 400)
      } else {
        setTimeout(() => handleRoleRedirect(response.data.user), 500)
      }
    } catch (error) {
      const msg = error.response?.data?.message || t.invalidOtp
      setOtpError(msg)
      setOtp(Array(OTP_LENGTH).fill(''))
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ─── RESEND OTP ────────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (countdown > 0) return
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      await authService.sendOTP(cleanPhone)
      setCountdown(RESEND_COOLDOWN)
      setOtp(Array(OTP_LENGTH).fill(''))
      setOtpError('')
      toast.success(t.otpSent)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    }
  }

  // ─── NEW USER NAME COMPLETION ──────────────────────────────────────────────
  const handleCompleteName = async (e) => {
    e.preventDefault()
    if (!newUserData.firstName.trim()) {
      handleRoleRedirect({ role: 'customer' })
      return
    }
    setLoading(true)
    try {
      const res = await userService.updateProfile({
        firstName: newUserData.firstName.trim(),
        lastName: newUserData.lastName.trim() || 'User'
      })
      if (res.data?.success && res.data?.user) {
        handleRoleRedirect(res.data.user)
      } else {
        handleRoleRedirect({ role: 'customer', firstName: newUserData.firstName })
      }
    } catch (err) {
      handleRoleRedirect({ role: 'customer' })
    } finally {
      setLoading(false)
    }
  }

  // ─── EMAIL LOGIN ───────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!emailData.email || !emailData.password) {
      toast.error('Please enter both email and password')
      return
    }
    setLoading(true)
    try {
      const response = await authService.login(emailData.email.trim(), emailData.password, rememberMe)
      await login(response.data.user, response.data.token, response.data.refreshToken)
      handleRoleRedirect(response.data.user)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── STYLING TOKENS ────────────────────────────────────────────────────────
  const cardBg = isDarkMode
    ? 'bg-[#0e0e0e]/95 border-white/10 text-white shadow-[0_12px_45px_rgba(0,0,0,0.6)]'
    : 'bg-white/95 border-gray-200/80 text-gray-900 shadow-[0_12px_45px_rgba(0,0,0,0.06)]'

  const inputClass = `w-full text-sm py-3.5 rounded-2xl focus:ring-2 focus:ring-amber-400/50 outline-none bg-transparent border transition-all duration-200 ${
    isDarkMode
      ? 'border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/50'
      : 'border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500/50'
  }`

  const primaryBtn = 'w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]'

  const subtleText = isDarkMode ? 'text-white/50' : 'text-gray-500'
  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`w-full max-w-md rounded-3xl border overflow-hidden p-6 md:p-8 backdrop-blur-xl transition-all duration-300 ${cardBg}`}
      >
        {/* ── Top Bar: Language & Theme ── */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-1.5 items-center">
            <FiGlobe className="text-amber-500 text-sm" />
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className={`bg-transparent border-0 text-xs font-semibold focus:ring-0 outline-none p-0 cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              <option className="bg-gray-900 text-white" value="en">English</option>
              <option className="bg-gray-900 text-white" value="te">తెలుగు</option>
              <option className="bg-gray-900 text-white" value="hi">हिन्दी</option>
            </select>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-300 ${
              isDarkMode ? 'bg-white/5 border-white/10 text-amber-500 hover:bg-white/10' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
            }`}
          >
            {isDarkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
          </button>
        </div>

        {/* ── Brand Header ── */}
        <div className="text-center mb-6">
          <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-black font-black text-xl mx-auto mb-3 shadow-md shadow-amber-500/20">
            S
          </div>
          <h1 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t.welcome}
          </h1>
          <p className={`text-xs mt-1 ${subtleText}`}>{t.subtitle}</p>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: MAIN FAST LOGIN (Google + Mobile Number)                   */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {step === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Google Fast Login */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className={`w-full py-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-3 hover:border-amber-400/50 active:scale-[0.98] ${
                  isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t.continueGoogle}
              </button>

              {/* Minimal Divider */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className={`px-4 font-semibold ${isDarkMode ? 'bg-[#0e0e0e] text-white/40' : 'bg-white text-gray-400'}`}>
                    {t.orText}
                  </span>
                </div>
              </div>

              {/* Mobile Number Form */}
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className={labelClass}>{t.phoneLabel}</label>
                  <div className="relative">
                    <span className={`absolute left-4 top-3.5 text-sm font-bold ${isDarkMode ? 'text-white/50' : 'text-gray-400'}`}>
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={t.phonePlaceholder}
                      maxLength={10}
                      className={`pl-14 tracking-wider font-semibold ${inputClass}`}
                      autoFocus
                      required
                    />
                    {phone.length === 10 && (
                      <FiCheckCircle className="absolute right-4 top-4 text-green-500" size={16} />
                    )}
                  </div>
                  {phone.length > 0 && phone.length < 10 && (
                    <p className="text-[11px] text-amber-500 mt-1 ml-1">{10 - phone.length} digits remaining</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || phone.length < 10}
                  className={primaryBtn}
                >
                  {otpLoading ? (
                    <><FiLoader size={16} className="animate-spin" /> {t.sendingOtp}</>
                  ) : (
                    <><FiSmartphone size={16} /> {t.getOtp} <FiChevronRight size={16} /></>
                  )}
                </button>
              </form>

              {/* Email Option Toggle */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className={`text-xs font-semibold transition-colors hover:text-amber-500 flex items-center justify-center gap-1.5 mx-auto ${subtleText}`}
                >
                  <FiMail size={13} /> {t.emailOption}
                </button>
              </div>

              {/* Trust Badge */}
              <p className={`text-center text-[11px] ${subtleText} flex items-center justify-center gap-1.5 pt-2`}>
                <FiShield size={12} className="text-green-500" />
                {t.secureLogin}
              </p>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: OTP VERIFICATION                                        */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header Info */}
              {!otpSuccess && (
                <div className={`rounded-2xl p-4 mb-5 flex gap-3 items-start ${isDarkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                  <FiSmartphone className="shrink-0 mt-0.5 text-amber-500" size={18} />
                  <div>
                    <p className="font-bold text-amber-500 text-xs uppercase tracking-wider">{t.otpTitle}</p>
                    <p className={`text-xs mt-0.5 ${subtleText}`}>
                      {t.otpDesc} <span className="font-bold text-amber-500">+91 {phone}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Success Banner */}
              {otpSuccess && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`rounded-2xl p-6 mb-5 text-center ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}
                >
                  <FiCheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                  <p className="font-bold text-green-600 text-sm">{t.otpVerified}</p>
                </motion.div>
              )}

              {!otpSuccess && (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  {/* OTP Input Boxes */}
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className={`w-11 h-13 text-center text-lg font-black rounded-xl border-2 bg-transparent outline-none transition-all duration-200 ${
                          digit
                            ? 'border-amber-500 text-amber-500 shadow-md shadow-amber-500/10'
                            : isDarkMode
                              ? 'border-white/15 hover:border-white/30 text-white'
                              : 'border-gray-200 hover:border-gray-300 text-gray-900'
                        }`}
                      />
                    ))}
                  </div>

                  {/* OTP Error */}
                  {otpError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-xs text-red-500 font-semibold"
                    >
                      {otpError}
                    </motion.p>
                  )}

                  {/* Verify Button */}
                  <button
                    type="submit"
                    disabled={loading || otp.join('').length < OTP_LENGTH}
                    className={primaryBtn}
                  >
                    {loading ? (
                      <><FiLoader size={16} className="animate-spin" /> {t.verifying}</>
                    ) : (
                      <><FiCheckCircle size={16} /> {t.verifyOtp}</>
                    )}
                  </button>

                  {/* Resend + Change Number */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => { setStep('main'); setOtp(Array(OTP_LENGTH).fill('')); setOtpError('') }}
                      className={`flex items-center gap-1 font-semibold transition-colors ${isDarkMode ? 'text-white/60 hover:text-amber-500' : 'text-gray-500 hover:text-amber-600'}`}
                    >
                      <FiArrowLeft size={12} /> {t.changeNumber}
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={countdown > 0}
                      className={`font-bold transition-colors ${
                        countdown > 0
                          ? isDarkMode ? 'text-white/30 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                          : 'text-amber-500 hover:text-amber-400 hover:underline'
                      }`}
                    >
                      {countdown > 0 ? `${t.resendIn} ${countdown}s` : t.resendOtp}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: NEW USER NAME PROMPT (Optional 1-click step)           */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-500">
                  <FiUser size={22} />
                </div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t.welcomeNewUser}
                </h2>
                <p className={`text-xs ${subtleText}`}>{t.namePrompt}</p>
              </div>

              <form onSubmit={handleCompleteName} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t.firstName}</label>
                    <input
                      type="text"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="e.g. Rahul"
                      className={inputClass}
                      autoFocus
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t.lastName}</label>
                    <input
                      type="text"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="e.g. Sharma"
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={primaryBtn}
                >
                  {loading ? (
                    <><FiLoader size={16} className="animate-spin" /> {t.signing}</>
                  ) : (
                    t.completeSetup
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 4: EMAIL & PASSWORD LOGIN                                  */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={() => setStep('main')}
                className={`flex items-center gap-1.5 text-xs font-semibold mb-5 transition-colors ${isDarkMode ? 'text-white/60 hover:text-amber-500' : 'text-gray-500 hover:text-amber-600'}`}
              >
                <FiArrowLeft size={14} /> {t.backToLogin}
              </button>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>{t.emailLabel}</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-3.5 text-amber-500" />
                    <input
                      type="email"
                      value={emailData.email}
                      onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                      placeholder={t.emailPlaceholder}
                      className={`pl-10 ${inputClass}`}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t.passwordLabel}</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-3.5 text-amber-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={emailData.password}
                      onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                      placeholder={t.passwordPlaceholder}
                      className={`pl-10 pr-10 ${inputClass}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-amber-500"
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center my-1 select-none">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded accent-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className={`text-[11px] font-semibold ${subtleText}`}>Remember Me</span>
                  </label>
                  <Link to="/forgot-password" className="text-xs text-amber-500 hover:underline font-semibold">
                    {t.forgotPassword}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={primaryBtn}
                >
                  {loading ? (
                    <><FiLoader size={16} className="animate-spin" /> {t.signing}</>
                  ) : (
                    t.signIn
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Simple Registration Link ── */}
        <p className={`text-center text-xs mt-6 ${subtleText}`}>
          {t.noAccount}{' '}
          <Link to="/register" className="text-amber-500 font-bold hover:underline">
            {t.signUp}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Login
