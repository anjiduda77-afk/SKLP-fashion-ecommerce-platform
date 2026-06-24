import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { authService } from '@services/apiServices'
import { toast } from 'react-toastify'
import { 
  FiMail, FiLock, FiEye, FiEyeOff, FiPhone, 
  FiSmartphone, FiShield, FiSun, FiMoon, FiGlobe, FiCheckCircle, FiArrowLeft
} from 'react-icons/fi'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { isDarkMode, toggleTheme, language, changeLanguage } = useTheme()
  const [activeTab, setActiveTab] = useState('email')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  // Email credentials state
  const [emailData, setEmailData] = useState({ email: '', password: '' })

  // OTP credentials state
  const [otpData, setOtpData] = useState({ phone: '', otp: '' })
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)

  // Translations
  const translations = {
    en: {
      title: 'Welcome to SKLP',
      subtitle: 'Sign in to shop the best fashion',
      phoneLabel: 'Mobile Number',
      phonePlaceholder: 'Enter 10-digit mobile number',
      otpLabel: 'Enter OTP',
      otpPlaceholder: 'Enter 6-digit OTP',
      sendOtp: 'Send OTP',
      verifyOtp: 'Verify & Sign In',
      otpSentMsg: 'OTP Sent!',
      otpSentDesc: 'Check your SMS for OTP sent to +91',
      changeNumber: '← Change number',
      orText: 'or sign in with',
      google: 'Continue with Google',
      emailMode: 'Email & Password',
      otpMode: 'Mobile OTP',
      emailLabel: 'Email Address',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      signing: 'Signing in...',
      sendingOtp: 'Sending OTP...',
      verifying: 'Verifying...'
    },
    te: {
      title: 'SKLP కి స్వాగతం',
      subtitle: 'అద్భుతమైన ఫ్యాషన్ కొనుగోలు చేయడానికి సైన్ ఇన్ చేయండి',
      phoneLabel: 'మొబైల్ నంబర్',
      phonePlaceholder: '10 అంకెల మొబైల్ నంబర్',
      otpLabel: 'OTP నమోదు చేయండి',
      otpPlaceholder: '6 అంకెల OTP',
      sendOtp: 'OTP పంపండి',
      verifyOtp: 'ధృవీకరించి సైన్ ఇన్ చేయండి',
      otpSentMsg: 'OTP పంపబడింది!',
      otpSentDesc: '+91 కి పంపిన SMS తనిఖీ చేయండి',
      changeNumber: '← నంబ��్ మార్చండి',
      orText: 'లేదా దీనితో సైన్ ఇన్ చేయండి',
      google: 'Google తో కొనసాగించండి',
      emailMode: 'ఇమెయిల్ & పాస్‌వర్డ్',
      otpMode: 'మొబైల్ OTP',
      emailLabel: 'ఇమెయిల్ చిరునామా',
      emailPlaceholder: 'మీ ఇమెయిల్ నమోదు చేయండి',
      passwordLabel: 'పాస్‌వర్డ్',
      passwordPlaceholder: 'మీ పాస్‌వర్డ్ నమోదు చేయండి',
      signIn: 'సైన్ ఇన్',
      forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?',
      noAccount: 'ఖాతా లేదా?',
      signUp: 'సైన్ అప్ చేయండి',
      signing: 'సైన్ ఇన్ అవుతోంది...',
      sendingOtp: 'OTP పంపుతోంది...',
      verifying: 'ధృవీకరిస్తోంది...'
    },
    hi: {
      title: 'SKLP में आपका स्वागत है',
      subtitle: 'बेहतरीन फैशन शॉपिंग के लिए साइन इन करें',
      phoneLabel: 'मोबाइल नंबर',
      phonePlaceholder: '10 अंकों का मोबाइल नंबर',
      otpLabel: 'OTP डालें',
      otpPlaceholder: '6 अंकों का OTP',
      sendOtp: 'OTP भेजें',
      verifyOtp: 'सत्यापित करें और साइन इन करें',
      otpSentMsg: 'OTP भेज दिया गया!',
      otpSentDesc: '+91 पर भेजा गया SMS चेक करें',
      changeNumber: '← नंबर बदलें',
      orText: 'या इससे साइन इन करें',
      google: 'Google से जारी रखें',
      emailMode: 'ईमेल और पासवर्ड',
      otpMode: 'मोबाइल OTP',
      emailLabel: 'ईमेल पता',
      emailPlaceholder: 'अपना ईमेल डालें',
      passwordLabel: 'पासवर्ड',
      passwordPlaceholder: 'अपना पासवर्ड डालें',
      signIn: 'साइन इन',
      forgotPassword: 'पासवर्ड भूल गए?',
      noAccount: 'खाता नहीं है?',
      signUp: 'साइन अप करें',
      signing: 'साइन इन हो रहा है...',
      sendingOtp: 'OTP भेज रहे हैं...',
      verifying: 'सत्यापित हो रहा है...'
    }
  }

  const t = translations[language] || translations.en

  // Redirect based on user role - Handles all 4 account types
  const handleRoleRedirect = (userObj) => {
    const role = (userObj?.role || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim()

    toast.success(`Welcome, ${userObj.firstName || 'User'}!`)

    const roleMap = {
      'admin': '/admin/dashboard',
      'seller': '/seller/dashboard',
      'delivery': '/delivery/dashboard',
      'deliverypartner': '/delivery/dashboard',
      'deliveryPartner': '/delivery/dashboard',
      'customer': '/',
      'user': '/'
    }

    const redirectUrl = roleMap[role] || '/'
    navigate(redirectUrl)
  }

  // Email Login
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await authService.login(emailData.email, emailData.password, rememberMe)
      login(response.data.user, response.data.token, response.data.refreshToken)
      handleRoleRedirect(response.data.user)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{10}$/.test(otpData.phone)) {
      toast.error('Please enter a valid 10-digit mobile number.')
      return
    }
    setOtpLoading(true)
    try {
      await authService.sendOTP(otpData.phone)
      setOtpSent(true)
      toast.success('OTP sent to your mobile number.')
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to send OTP.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{6}$/.test(otpData.otp)) {
      toast.error('Please enter a valid 6-digit OTP.')
      return
    }
    setLoading(true)
    try {
      const response = await authService.verifyOTP(otpData.phone, otpData.otp)
      login(response.data.user, response.data.token, response.data.refreshToken)
      handleRoleRedirect(response.data.user)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Google Login
  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const response = await authService.googleLogin('google_premium_vip_pass')
      login(response.data.user, response.data.token, response.data.refreshToken)
      handleRoleRedirect(response.data.user)
    } catch (error) {
      toast.error('Google login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      
      {/* Clean Glassmorphic Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 md:p-8 backdrop-blur-3xl transition-all duration-500
          ${isDarkMode 
            ? 'bg-luxury-black/85 border-white/10 text-white shadow-dark-glow' 
            : 'bg-white/90 border-luxury-gold/30 text-luxury-darkBlack shadow-hover'
          }`}
      >
        {/* Top Controls: Language & Theme */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-1.5 items-center">
            <FiGlobe className="text-luxury-gold text-sm" />
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className={`bg-transparent border-0 text-xs font-semibold focus:ring-0 outline-none p-0 cursor-pointer
                ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
            >
              <option className="bg-luxury-black text-white" value="en">English</option>
              <option className="bg-luxury-black text-white" value="te">తెలుగు</option>
              <option className="bg-luxury-black text-white" value="hi">हिन्दी</option>
            </select>
          </div>

          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-300
              ${isDarkMode ? 'bg-white/5 border-white/10 text-luxury-gold hover:bg-white/10' : 'bg-luxury-gold/15 border-luxury-gold/30 text-black hover:bg-luxury-gold/30'}`}
          >
            {isDarkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
          </button>
        </div>

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-luxury-gold to-yellow-500 flex items-center justify-center text-black font-extrabold text-xl mx-auto mb-4 shadow-glow">
            S
          </div>
          <h1 className={`text-2xl font-serif font-black ${isDarkMode ? 'text-white' : 'text-luxury-darkBlack'}`}>
            {t.title}
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>{t.subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className={`flex rounded-2xl border overflow-hidden mb-6 ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
          <button
            onClick={() => { setActiveTab('otp'); setOtpSent(false) }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5
              ${activeTab === 'otp' 
                ? 'bg-luxury-gold text-black' 
                : isDarkMode ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
              }`}
          >
            <FiSmartphone size={14} />
            {t.otpMode}
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5
              ${activeTab === 'email' 
                ? 'bg-luxury-gold text-black' 
                : isDarkMode ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-50 text-slate-500 hover:bg-gray-100'
              }`}
          >
            <FiMail size={14} />
            {t.emailMode}
          </button>
        </div>

        {/* OTP Login */}
        <AnimatePresence mode="wait">
          {activeTab === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white/80' : 'text-slate-600'}`}>
                      {t.phoneLabel}
                    </label>
                    <div className="relative">
                      <span className={`absolute left-3.5 top-3.5 text-sm font-semibold ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>
                        +91
                      </span>
                      <input
                        type="tel"
                        value={otpData.phone}
                        onChange={(e) => setOtpData({ ...otpData, phone: e.target.value.replace(/\D/g, '') })}
                        placeholder={t.phonePlaceholder}
                        maxLength={10}
                        className={`pl-14 text-sm py-3.5 rounded-2xl focus:ring-2 focus:ring-luxury-gold/50 outline-none w-full bg-transparent border transition-all
                          ${isDarkMode ? 'border-white/15 text-white placeholder:text-white/30' : 'border-black/10 text-slate-900 placeholder:text-slate-400'}`}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading || otpData.phone.length < 10}
                    className="w-full py-4 bg-luxury-gold text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-yellow-500 transition-all shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <FiPhone size={16} />
                    {otpLoading ? t.sendingOtp : t.sendOtp}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="bg-green-500/10 rounded-2xl border border-green-500/20 p-4 text-sm flex gap-3 items-start">
                    <FiCheckCircle size={18} className="shrink-0 mt-0.5 text-green-500" />
                    <div>
                      <p className="font-bold text-green-500">{t.otpSentMsg}</p>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                        {t.otpSentDesc} {otpData.phone}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white/80' : 'text-slate-600'}`}>
                      {t.otpLabel}
                    </label>
                    <div className="relative">
                      <FiShield className="absolute left-3.5 top-3.5 text-luxury-gold" />
                      <input
                        type="text"
                        value={otpData.otp}
                        onChange={(e) => setOtpData({ ...otpData, otp: e.target.value.replace(/\D/g, '') })}
                        placeholder={t.otpPlaceholder}
                        maxLength={6}
                        className={`pl-10 text-sm py-3.5 rounded-2xl focus:ring-2 focus:ring-luxury-gold/50 outline-none w-full bg-transparent border tracking-[0.5em] text-center font-bold transition-all
                          ${isDarkMode ? 'border-white/15 text-white placeholder:text-white/30' : 'border-black/10 text-slate-900 placeholder:text-slate-400'}`}
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpData.otp.length < 6}
                    className="w-full py-4 bg-luxury-gold text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-yellow-500 transition-all shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <FiShield size={16} />
                    {loading ? t.verifying : t.verifyOtp}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpData({ ...otpData, otp: '' }) }}
                    className="w-full text-center text-xs text-luxury-gold hover:underline font-semibold mt-1 flex items-center justify-center gap-1"
                  >
                    <FiArrowLeft size={12} />
                    {t.changeNumber}
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* Email Login */}
          {activeTab === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white/80' : 'text-slate-600'}`}>
                    {t.emailLabel}
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-3.5 text-luxury-gold" />
                    <input
                      type="email"
                      value={emailData.email}
                      onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                      placeholder={t.emailPlaceholder}
                      className={`pl-10 text-sm py-3.5 rounded-2xl focus:ring-2 focus:ring-luxury-gold/50 outline-none w-full bg-transparent border transition-all
                        ${isDarkMode ? 'border-white/15 text-white placeholder:text-white/30' : 'border-black/10 text-slate-900 placeholder:text-slate-400'}`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white/80' : 'text-slate-600'}`}>
                    {t.passwordLabel}
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-3.5 text-luxury-gold" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={emailData.password}
                      onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                      placeholder={t.passwordPlaceholder}
                      className={`pl-10 pr-10 text-sm py-3.5 rounded-2xl focus:ring-2 focus:ring-luxury-gold/50 outline-none w-full bg-transparent border transition-all
                        ${isDarkMode ? 'border-white/15 text-white placeholder:text-white/30' : 'border-black/10 text-slate-900 placeholder:text-slate-400'}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-luxury-gold"
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center my-2 select-none">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded accent-luxury-gold focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                      Remember Me
                    </span>
                  </label>
                  <Link to="/forgot-password" className="text-xs text-luxury-gold hover:underline font-semibold">
                    {t.forgotPassword}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-luxury-gold text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-yellow-500 transition-all shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading ? t.signing : t.signIn}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className={`px-4 ${isDarkMode ? 'bg-luxury-black/85 text-white/50' : 'bg-white/90 text-slate-400'}`}>
              {t.orText}
            </span>
          </div>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full py-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-3 hover:border-luxury-gold/50 active:scale-[0.98]
            ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-black/10 text-slate-700 hover:bg-gray-50 shadow-sm'}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t.google}
        </button>

        {/* Register Link */}
        <p className={`text-center text-sm mt-8 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
          {t.noAccount}{' '}
          <Link to="/register" className="text-luxury-gold font-bold hover:underline">
            {t.signUp}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Login
