import { useState, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { authService } from '@services/apiServices'
import apiClient from '@services/apiClient'
import { auth, googleProvider, signInWithPopup, FIREBASE_CONFIGURED } from '../../config/firebase'
import { toast } from 'react-toastify'
import { 
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, 
  FiLoader, FiArrowRight, FiShield, FiCheck 
} from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'

// Helper to map Firebase Google Auth error codes to user-friendly messages
const getFirebaseGoogleErrorMessage = (error) => {
  if (!error) return 'Google signup failed. Please try again.'
  switch (error.code) {
    case 'auth/popup-closed-by-user':
      return 'Google signup was cancelled before completion.'
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site.'
    case 'auth/unauthorized-domain':
      return 'Domain not authorized in Firebase Console. Please add this domain in Firebase Authentication settings.'
    case 'auth/cancelled-popup-request':
      return 'Previous signup request was cancelled.'
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.'
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase Console. Please enable Google provider.'
    default:
      return error.message || 'Unable to sign up with Google. Please try again.'
  }
}

function PasswordStrengthBar({ password }) {
  const { t } = useTranslation()
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Symbol', pass: /[!@#$%^&*]/.test(password) },
  ]
  const strength = checks.filter((c) => c.pass).length
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']
  const labels = ['Weak', 'Fair', 'Good', 'Strong']

  if (!password) return null

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : 'bg-gray-200 dark:bg-white/10'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex gap-2 text-gray-400">
          {checks.map(({ label, pass }) => (
            <span
              key={label}
              className={`flex items-center gap-0.5 ${
                pass ? 'text-emerald-500 font-bold' : 'opacity-60'
              }`}
            >
              <FiCheck size={9} />
              {label}
            </span>
          ))}
        </div>
        <span className={`font-bold ${colors[strength - 1]?.replace('bg-', 'text-')}`}>
          {strength > 0 ? labels[strength - 1] : ''}
        </span>
      </div>
    </div>
  )
}

function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { isDarkMode } = useTheme()


  const redirectUrl = new URLSearchParams(location.search).get('redirect') || null

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Redirect handler after successful registration
  const handleRedirectAfterLogin = useCallback((userObj) => {
    const name = userObj?.firstName && userObj.firstName !== 'Customer' ? userObj.firstName : ''
    toast.success(`Welcome to SKLP Fashion${name ? `, ${name}` : ''}! 🎉`)

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

  // ── 1. Email & Password Signup Handler ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanFirst = formData.firstName.trim()
    const cleanLast = formData.lastName.trim()
    const cleanEmail = formData.email.trim().toLowerCase()
    const pass = formData.password

    if (!cleanFirst) {
      toast.error('Please enter your first name.')
      return
    }

    if (!cleanEmail) {
      toast.error('Please enter a valid email address.')
      return
    }

    if (!pass) {
      toast.error('Please enter a password.')
      return
    }

    if (pass.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    if (!/[A-Z]/.test(pass)) {
      toast.error('Password must contain at least one uppercase letter (A-Z).')
      return
    }

    if (!/[a-z]/.test(pass)) {
      toast.error('Password must contain at least one lowercase letter (a-z).')
      return
    }

    if (!/[0-9]/.test(pass)) {
      toast.error('Password must contain at least one number (0-9).')
      return
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) {
      toast.error('Password must contain at least one special character (!@#$%^&*).')
      return
    }

    if (pass !== formData.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (!formData.agreeTerms) {
      toast.error('Please agree to the Terms of Service & Privacy Policy.')
      return
    }

    setLoading(true)
    const targetUrl = `${apiClient.defaults.baseURL || ''}/auth/register`

    try {
      const payload = {
        firstName: cleanFirst,
        lastName: cleanLast || 'User',
        email: cleanEmail,
        password: pass
      }

      const res = await authService.register(payload)

      if (res.data?.success && res.data?.token) {
        const { user: userObj, token: authToken, refreshToken } = res.data
        login(userObj, authToken, refreshToken)
        handleRedirectAfterLogin(userObj)
      } else {
        throw new Error(res.data?.message || 'Registration failed')
      }
    } catch (err) {
      console.error('[REGISTER] Registration error object:', err)
      const status = err.response?.status
      const data = err.response?.data

      let errorMsg = ''
      if (data?.errors) {
        if (Array.isArray(data.errors)) {
          errorMsg = data.errors.map(e => (typeof e === 'object' ? e.message : e)).join('. ')
        } else if (typeof data.errors === 'string') {
          errorMsg = data.errors
        }
      } else if (data?.message) {
        errorMsg = data.message
      }

      if (!errorMsg) {
        if (err.message === 'Network Error' || !err.response) {
          if (targetUrl.includes('localhost') && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            errorMsg = 'Backend URL Mismatch: Frontend is trying to call localhost in production. Please configure VITE_API_URL in your deployment.'
          } else {
            errorMsg = `Cannot connect to server. Please verify your internet connection or server status.`
          }
        } else {
          errorMsg = `Registration failed (${status || 'Error'}): ${err.message || 'Please try again.'}`
        }
      }

      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. Google Signup with Firebase ─────────────────────────────────────────
  const handleGoogleSignup = async () => {
    if (googleLoading || loading) return

    if (!FIREBASE_CONFIGURED || !auth || !googleProvider) {
      toast.error('Google Sign-In is not configured. Please check Firebase configuration.')
      return
    }

    setGoogleLoading(true)
    try {
      const userCredential = await signInWithPopup(auth, googleProvider)
      const idToken = await userCredential.user.getIdToken()

      const res = await authService.firebaseLogin(idToken)
      if (res.data?.success && res.data?.token) {
        const { user: userObj, token: authToken, refreshToken } = res.data
        login(userObj, authToken, refreshToken)
        handleRedirectAfterLogin(userObj)
      } else {
        throw new Error(res.data?.message || 'Google signup failed on server')
      }
    } catch (error) {
      console.error('Google Signup error:', error)
      const msg = getFirebaseGoogleErrorMessage(error)
      if (error.code === 'auth/popup-closed-by-user') {
        toast.info(msg)
      } else {
        toast.error(msg)
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  // Card & theme styles
  const cardBg = isDarkMode
    ? 'bg-[#0e0e0e]/95 border-white/10 text-white shadow-[0_12px_45px_rgba(0,0,0,0.6)]'
    : 'bg-white/95 border-gray-200/80 text-gray-900 shadow-[0_12px_45px_rgba(0,0,0,0.06)]'

  const inputClass = `w-full text-sm py-3.5 pl-10 pr-10 rounded-2xl focus:ring-2 focus:ring-amber-400/50 outline-none bg-transparent border transition-all duration-200 ${
    isDarkMode
      ? 'border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/50 bg-white/5'
      : 'border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500/50 bg-gray-50'
  }`

  const primaryBtn = 'w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]'

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className={`p-8 md:p-10 rounded-3xl border backdrop-blur-xl ${cardBg}`}>
          {/* Header Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3 font-serif font-black text-xl shadow-inner">
              S
            </div>
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-amber-500">
              SKLP Fashion
            </h2>
            <h1 className="text-2xl font-serif font-bold tracking-tight mt-1">
              {t('auth.register', 'Create an Account')}
            </h1>
            <p className="text-xs opacity-65 mt-1.5 leading-relaxed">
              {t('auth.registerSubtitle', 'Join SKLP Fashion for a personalized luxury shopping experience.')}
            </p>
          </div>

          {/* ── GOOGLE SIGN-UP BUTTON ── */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            className={`w-full py-3.5 px-4 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-sm active:scale-[0.98] mb-6 ${
              isDarkMode
                ? 'border-white/15 bg-white/5 hover:bg-white/10 text-white hover:border-amber-400/40'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800 hover:border-amber-500/40'
            }`}
          >
            {googleLoading ? (
              <>
                <FiLoader size={18} className="animate-spin text-amber-500" />
                <span>{t('common.loading', 'Connecting to Google...')}</span>
              </>
            ) : (
              <>
                <FcGoogle size={20} />
                <span>{t('auth.googleLogin', 'Sign up with Google')}</span>
              </>
            )}
          </button>

          {/* ── DIVIDER ── */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-current/10 w-full"></div>
            <span className="bg-transparent px-3 text-[11px] uppercase tracking-widest font-bold opacity-50 absolute">
              {t('auth.orContinueWith', 'or register with email')}
            </span>
          </div>

          {/* ── REGISTRATION FORM ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  {t('profile.firstName', 'First Name')}
                </label>
                <div className="relative flex items-center">
                  <FiUser className="absolute left-3.5 text-amber-500 opacity-80" size={16} />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First Name"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  {t('profile.lastName', 'Last Name')}
                </label>
                <div className="relative flex items-center">
                  <FiUser className="absolute left-3.5 text-amber-500 opacity-80" size={16} />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-75">
                {t('auth.email', 'Email Address')}
              </label>
              <div className="relative flex items-center">
                <FiMail className="absolute left-3.5 text-amber-500 opacity-80" size={16} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-75">
                {t('auth.password', 'Password')}
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-amber-500 opacity-80" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-amber-500 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              <PasswordStrengthBar password={formData.password} />
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-75">
                {t('auth.confirmPassword', 'Confirm Password')}
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-amber-500 opacity-80" size={16} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-amber-500 transition-colors"
                >
                  {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Terms of Service Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs opacity-80 leading-relaxed">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400/50"
                  required
                />
                <span>
                  {t('auth.agreeTerms', "I agree to SKLP's Terms of Service and Privacy Policy.")}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className={`${primaryBtn} mt-2`}
            >
              {loading ? (
                <>
                  <FiLoader size={16} className="animate-spin" /> {t('common.loading', 'Creating Account...')}
                </>
              ) : (
                <>
                  <span>{t('auth.register', 'Create Account')}</span>
                  <FiArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* ── FOOTER: SIGN IN LINK ── */}
          <div className="mt-8 pt-6 border-t border-current/10 text-center">
            <p className="text-xs opacity-75">
              {t('auth.haveAccount', 'Already have an account?')}{' '}
              <Link
                to="/login"
                className="font-bold text-amber-500 hover:underline inline-flex items-center gap-1 ml-1"
              >
                {t('auth.signIn', 'Sign In')}
              </Link>
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-1.5 pt-4 text-[11px] font-medium opacity-50">
            <FiShield size={12} className="text-amber-500" />
            <span>{t('profile.sessionEncrypted', '256-bit SSL Encrypted & Google Firebase Secured')}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Register
