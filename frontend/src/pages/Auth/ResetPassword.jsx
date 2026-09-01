import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { authService } from '@services/apiServices'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'
import { 
  FiLock, FiEye, FiEyeOff, FiCheckCircle, 
  FiArrowLeft, FiShield, FiAlertTriangle, FiCheck 
} from 'react-icons/fi'

function PasswordStrengthBar({ password }) {
  const { t } = useTranslation()
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special symbol (!@#$%^&*)', pass: /[!@#$%^&*]/.test(password) },
  ]
  const strength = checks.filter((c) => c.pass).length
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
  const labels = ['Weak', 'Fair', 'Good', 'Strong']

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
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
      <div className="flex flex-wrap gap-2">
        {checks.map(({ label, pass }) => (
          <span
            key={label}
            className={`text-[11px] flex items-center gap-1 transition-colors ${
              pass ? 'text-green-500 font-semibold' : 'text-gray-400 opacity-60'
            }`}
          >
            <FiCheck size={10} />
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

function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isDarkMode } = useTheme()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!token) {
      toast.error(t('errors.invalidToken', 'Invalid or missing password reset token.'))
      return
    }

    if (password.length < 8) {
      toast.error(t('profile.minPasswordLength', 'Password must be at least 8 characters long.'))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('profile.passwordMismatch', 'Passwords do not match.'))
      return
    }

    setLoading(true)
    try {
      const response = await authService.resetPassword(token, password)
      if (response.data?.success) {
        setSuccess(true)
        toast.success(t('auth.passwordResetSuccess', 'Password reset successfully! Redirecting to login...'))
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('errors.serverError', 'Password reset failed. The link may have expired.'))
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

  const primaryBtn = 'w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm uppercase tracking-wider rounded-2xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]'

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className={`p-8 md:p-10 rounded-3xl border backdrop-blur-xl ${cardBg}`}>
          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline mb-6"
          >
            <FiArrowLeft size={14} /> {t('auth.backToLogin', 'Back to Sign In')}
          </Link>

          {!token ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto text-red-500">
                <FiAlertTriangle size={28} />
              </div>
              <h2 className="text-xl font-serif font-bold">{t('errors.invalidToken', 'Invalid Reset Link')}</h2>
              <p className="text-xs opacity-65 leading-relaxed">
                {t('errors.expiredToken', 'This password reset link is invalid or incomplete. Please request a new link from the forgot password page.')}
              </p>
              <Link
                to="/forgot-password"
                className={`mt-4 inline-block px-6 py-3 rounded-2xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider`}
              >
                {t('auth.requestNewLink', 'Request New Link')}
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto text-green-500">
                <FiCheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-amber-500">{t('auth.passwordUpdated', 'Password Updated!')}</h2>
              <p className="text-xs opacity-75">
                {t('auth.passwordResetSuccess', 'Your password has been successfully reset. Redirecting you to sign in...')}
              </p>
              <Link
                to="/login"
                className={`mt-4 inline-block px-6 py-3 rounded-2xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider`}
              >
                {t('auth.signInNow', 'Sign In Now')}
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500">
                  <FiLock size={24} />
                </div>
                <h1 className="text-2xl font-serif font-bold tracking-tight">{t('auth.setNewPassword', 'Set New Password')}</h1>
                <p className="text-xs opacity-65 mt-1.5">
                  {t('auth.setNewPasswordSubtitle', 'Create a strong, secure password for your SKLP account.')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-75">
                    {t('auth.newPassword', 'New Password')}
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-4 text-amber-500/60" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.enterNewPassword', 'Enter new password')}
                      className={`${inputClass} pl-11 pr-11`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-amber-500 transition-colors"
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={password} />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-75">
                    {t('auth.confirmPassword', 'Confirm New Password')}
                  </label>
                  <div className="relative">
                    <FiShield className="absolute left-4 top-4 text-amber-500/60" size={16} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.reenterNewPassword', 'Re-enter new password')}
                      className={`${inputClass} pl-11 pr-11 ${
                        confirmPassword && password !== confirmPassword ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-amber-500 transition-colors"
                    >
                      {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-red-400 text-xs mt-1 font-medium">{t('auth.passwordMismatch', 'Passwords do not match')}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !password || password !== confirmPassword}
                  className={primaryBtn}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    t('auth.resetPassword', 'Reset Password')
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ResetPassword

