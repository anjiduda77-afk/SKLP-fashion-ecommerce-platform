import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { authService } from '@services/apiServices'
import { toast } from 'react-toastify'
import { 
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, 
  FiCheckCircle, FiSmartphone, FiShield, FiSun, FiMoon 
} from 'react-icons/fi'

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special symbol', pass: /[!@#$%^&*]/.test(password) },
  ]
  const strength = checks.filter((c) => c.pass).length
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
  const labels = ['Weak', 'Fair', 'Good', 'Strong']

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : 'bg-gray-200 dark:bg-white/10'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(({ label, pass }) => (
          <span
            key={label}
            className={`text-[11px] flex items-center gap-1 transition-colors ${
              pass ? 'text-green-500 font-semibold' : 'text-gray-400'
            }`}
          >
            <FiCheckCircle size={10} />
            {label}
          </span>
        ))}
        <span className={`text-[11px] font-bold ml-auto ${colors[strength - 1]?.replace('bg-', 'text-')}`}>
          {strength > 0 ? labels[strength - 1] : ''}
        </span>
      </div>
    </div>
  )
}

function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    agreeTerms: true,
  })

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const isGoogleConfigured = Boolean(googleClientId && googleClientId.includes('.apps.googleusercontent.com'))

  // Google Registration / Login
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      try {
        const response = await authService.googleLogin(tokenResponse.access_token)
        if (response.data?.success && response.data?.user) {
          await login(response.data.user, response.data.token, response.data.refreshToken)
          toast.success(`Welcome to SKLP Fashion, ${response.data.user.firstName || 'User'}! 🎉`)
          navigate('/')
        }
      } catch (error) {
        console.error('Google register failed:', error)
        toast.error(error?.response?.data?.message || 'Google signup failed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    onError: (err) => {
      console.warn('Google OAuth error:', err)
      toast.error('Google authentication was cancelled.')
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
        const response = await authService.googleLogin(`google_user_${Date.now()}@sklp-fashion.com`)
        if (response.data?.success && response.data?.user) {
          await login(response.data.user, response.data.token, response.data.refreshToken)
          toast.info('Signed up with Google (Dev Mode). Add VITE_GOOGLE_CLIENT_ID for Real Google OAuth.')
          navigate('/')
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Google registration failed.')
      } finally {
        setLoading(false)
      }
      return
    }

    // In production, real Google OAuth is strictly required
    toast.error('Google Sign-Up is currently unavailable. Please register with Mobile OTP or Email.')
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.agreeTerms) {
      toast.error('Please accept the terms & conditions')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      }
      const response = await authService.register(payload)
      if (response.data?.success && response.data?.user) {
        await login(response.data.user, response.data.token, response.data.refreshToken)
        toast.success('Account created successfully! Welcome to SKLP 🎉')
        navigate('/')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cardBg = isDarkMode
    ? 'bg-[#0e0e0e]/95 border-white/10 text-white shadow-[0_12px_45px_rgba(0,0,0,0.6)]'
    : 'bg-white/95 border-gray-200/80 text-gray-900 shadow-[0_12px_45px_rgba(0,0,0,0.06)]'

  const inputClass = `w-full text-sm py-3.5 rounded-2xl focus:ring-2 focus:ring-amber-400/50 outline-none bg-transparent border transition-all duration-200 ${
    isDarkMode
      ? 'border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/50'
      : 'border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500/50'
  }`

  const subtleText = isDarkMode ? 'text-white/50' : 'text-gray-500'
  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`w-full max-w-md rounded-3xl border overflow-hidden p-6 md:p-8 backdrop-blur-xl transition-all duration-300 ${cardBg}`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <Link to="/login" className="text-xs font-semibold text-amber-500 hover:underline">
            ← Back to Sign In
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
              isDarkMode ? 'bg-white/5 border-white/10 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}
          >
            {isDarkMode ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-black font-black text-xl mx-auto mb-3 shadow-md shadow-amber-500/20">
            S
          </div>
          <h1 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Join SKLP Fashion
          </h1>
          <p className={`text-xs mt-1 ${subtleText}`}>
            Create your account in seconds for a seamless shopping experience
          </p>
        </div>

        {/* Fast Action Buttons: Google + Mobile OTP */}
        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className={`w-full py-3 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-center gap-2.5 hover:border-amber-400/50 active:scale-[0.98] ${
              isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <Link
            to="/login"
            className={`w-full py-3 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              isDarkMode ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiSmartphone size={14} className="text-amber-500" />
            Register with Mobile OTP
          </Link>
        </div>

        {/* Divider */}
        <div className="relative py-1 mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className={`px-3 font-semibold ${isDarkMode ? 'bg-[#0e0e0e] text-white/40' : 'bg-white text-gray-400'}`}>
              or with Email
            </span>
          </div>
        </div>

        {/* Email Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First Name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-3.5 text-amber-500" size={15} />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className={`pl-10 ${inputClass}`}
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-3.5 text-amber-500" size={15} />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className={`pl-10 ${inputClass}`}
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-3.5 text-amber-500" size={15} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`pl-10 ${inputClass}`}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={labelClass}>Create Password</label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-3.5 text-amber-500" size={15} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className={`pl-10 pr-10 ${inputClass}`}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-amber-500"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            <PasswordStrength password={formData.password} />
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="mt-0.5 rounded accent-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span className={`text-[11px] ${subtleText}`}>
              I agree to the Terms of Service & Privacy Policy
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create Customer Account'
            )}
          </button>
        </form>

        {/* Trust badge */}
        <p className={`text-center text-[11px] ${subtleText} flex items-center justify-center gap-1.5 pt-4`}>
          <FiShield size={12} className="text-green-500" />
          Customer data protected with enterprise-grade encryption
        </p>

        {/* Existing Account Link */}
        <p className={`text-center text-xs mt-4 ${subtleText}`}>
          Already have an account?{' '}
          <Link to="/login" className="text-amber-500 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Register
