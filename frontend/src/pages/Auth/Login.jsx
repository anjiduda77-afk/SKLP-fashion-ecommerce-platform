import { useState, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { authService } from '@services/apiServices'
import { auth, googleProvider, signInWithPopup, FIREBASE_CONFIGURED } from '../../config/firebase'
import { toast } from 'react-toastify'
import { 
  FiMail, FiLock, FiEye, FiEyeOff, 
  FiLoader, FiArrowRight, FiShield 
} from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'

// Helper to map Firebase Google Auth error codes to user-friendly messages
const getFirebaseGoogleErrorMessage = (error) => {
  if (!error) return 'Google sign-in failed. Please try again.'
  switch (error.code) {
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before completion.'
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site.'
    case 'auth/unauthorized-domain':
      return 'Domain not authorized in Firebase Console. Please add this domain in Firebase Authentication settings.'
    case 'auth/cancelled-popup-request':
      return 'Previous sign-in request was cancelled.'
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.'
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase Console. Please enable Google provider.'
    default:
      return error.message || 'Unable to sign in with Google. Please try again.'
  }
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { isDarkMode } = useTheme()

  // Preserved destination after successful verification
  const redirectUrl = new URLSearchParams(location.search).get('redirect') || null

  // Email / Password Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Redirect handler after verified login
  const handleRedirectAfterLogin = useCallback((userObj) => {
    const name = userObj?.firstName && userObj.firstName !== 'Customer' ? userObj.firstName : ''
    toast.success(`Welcome back${name ? `, ${name}` : ''}! 🎉`)

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

  // ── 1. Email & Password Login Handler ──────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      const res = await authService.login(email.trim().toLowerCase(), password, rememberMe)
      if (res.data?.success && res.data?.token) {
        const { user: userObj, token: authToken, refreshToken } = res.data
        login(userObj, authToken, refreshToken)
        handleRedirectAfterLogin(userObj)
      } else {
        throw new Error(res.data?.message || 'Login failed')
      }
    } catch (err) {
      console.error('Email login error:', err)
      const msg = err.response?.data?.message || 'Invalid email or password.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── 2. Google Login with Firebase Popup ────────────────────────────────────
  const handleGoogleLogin = async () => {
    if (googleLoading || loading) return

    if (!FIREBASE_CONFIGURED || !auth || !googleProvider) {
      toast.error('Google Sign-In is not configured. Please check Firebase configuration.')
      return
    }

    setGoogleLoading(true)
    try {
      const userCredential = await signInWithPopup(auth, googleProvider)
      const idToken = await userCredential.user.getIdToken()

      // Authenticate with backend using verified Firebase ID token
      const res = await authService.firebaseLogin(idToken)

      if (res.data?.success && res.data?.token) {
        const { user: userObj, token: authToken, refreshToken } = res.data
        login(userObj, authToken, refreshToken)
        handleRedirectAfterLogin(userObj)
      } else {
        throw new Error(res.data?.message || 'Google authentication failed on server')
      }
    } catch (error) {
      console.error('Google Sign-In error:', error)
      const msg = getFirebaseGoogleErrorMessage(error)
      toast.error(msg)
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
              Welcome Back
            </h1>
            <p className="text-xs opacity-65 mt-1.5 leading-relaxed">
              Sign in with your email or Google to continue shopping luxury fashion.
            </p>
          </div>

          {/* ── GOOGLE SIGN-IN BUTTON ── */}
          <button
            type="button"
            onClick={handleGoogleLogin}
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
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <FcGoogle size={20} />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* ── DIVIDER ── */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-current/10 w-full"></div>
            <span className="bg-transparent px-3 text-[11px] uppercase tracking-widest font-bold opacity-50 absolute">
              or sign in with email
            </span>
          </div>

          {/* ── EMAIL & PASSWORD FORM ── */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-75">
                Email Address
              </label>
              <div className="relative flex items-center">
                <FiMail className="absolute left-3.5 text-amber-500 opacity-80" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider opacity-75">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-amber-500 font-semibold hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-amber-500 opacity-80" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs opacity-80">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400/50"
                />
                <span>Remember me for 30 days</span>
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
                  <FiLoader size={16} className="animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* ── FOOTER: CREATE ACCOUNT LINK ── */}
          <div className="mt-8 pt-6 border-t border-current/10 text-center">
            <p className="text-xs opacity-75">
              Don't have an account yet?{' '}
              <Link
                to="/register"
                className="font-bold text-amber-500 hover:underline inline-flex items-center gap-1 ml-1"
              >
                Create an Account
              </Link>
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-1.5 pt-4 text-[11px] font-medium opacity-50">
            <FiShield size={12} className="text-amber-500" />
            <span>256-bit SSL Encrypted & Google Firebase Secured</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
