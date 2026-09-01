import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { authService } from '@services/apiServices'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { toast } from 'react-toastify'
import { 
  FiCheckCircle, FiAlertTriangle, 
  FiArrowLeft, FiSend, FiLoader, FiShoppingBag 
} from 'react-icons/fi'

function VerifyEmail() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { isDarkMode } = useTheme()
  const { user, refreshUser } = useAuth()

  const [verifying, setVerifying] = useState(Boolean(token))
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorMsg(t('auth.noTokenFound', 'No verification token found. Please check the link sent to your email.'))
      return
    }

    const verify = async () => {
      try {
        const res = await authService.verifyEmail(token)
        if (res.data?.success) {
          setSuccess(true)
          toast.success(t('auth.emailVerified', 'Email verified successfully! 🎉'))
          if (refreshUser) {
            refreshUser()
          }
        }
      } catch (err) {
        setErrorMsg(err.response?.data?.message || t('errors.expiredToken', 'Verification link is invalid or has expired.'))
      } finally {
        setVerifying(false)
      }
    }

    verify()
  }, [token, refreshUser, t])

  const handleResend = async (e) => {
    e.preventDefault()
    const targetEmail = resendEmail.trim() || user?.email
    if (!targetEmail) {
      toast.error(t('errors.invalidEmail', 'Please enter your email address'))
      return
    }

    setResending(true)
    try {
      const res = await authService.resendVerification(targetEmail)
      if (res.data?.success) {
        toast.success(t('auth.verificationResent', 'New verification link sent to your email! ✉️'))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('errors.serverError', 'Failed to resend verification email.'))
    } finally {
      setResending(false)
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
          {/* Back Link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:underline mb-6"
          >
            <FiArrowLeft size={14} /> {t('auth.backToLogin', 'Back to Sign In')}
          </Link>

          {verifying ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                <FiLoader size={28} className="animate-spin" />
              </div>
              <h2 className="text-xl font-serif font-bold">{t('auth.verifyingEmail', 'Verifying Your Email...')}</h2>
              <p className="text-xs opacity-65">
                {t('auth.verifyingSubtitle', 'Please wait while we confirm your email credentials.')}
              </p>
            </div>
          ) : success ? (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto text-green-500">
                <FiCheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-amber-500">{t('auth.emailVerifiedTitle', 'Email Verified!')}</h2>
              <p className="text-xs opacity-75 leading-relaxed">
                {t('auth.emailVerifiedSubtitle', 'Thank you for verifying your email address. Your SKLP Luxury Fashion account is now fully active.')}
              </p>
              <div className="pt-2 flex flex-col gap-3">
                <Link
                  to="/products"
                  className={primaryBtn}
                >
                  <FiShoppingBag size={16} /> {t('common.shopNow', 'Explore Luxury Couture')}
                </Link>
                <Link
                  to="/profile"
                  className="w-full py-3.5 text-center text-xs font-bold uppercase tracking-wider rounded-2xl border border-amber-500/30 hover:bg-amber-500/10 transition-all text-amber-500"
                >
                  {t('profile.title', 'Go to Atelier Profile')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-500">
                  <FiAlertTriangle size={24} />
                </div>
                <h1 className="text-2xl font-serif font-bold">{t('auth.verificationIssue', 'Verification Issue')}</h1>
                <p className="text-xs opacity-65 mt-2 leading-relaxed">
                  {errorMsg || t('errors.expiredToken', 'The verification link is invalid, expired, or has already been used.')}
                </p>
              </div>

              {/* Resend Form */}
              <form onSubmit={handleResend} className="space-y-4 pt-2 border-t border-current/10">
                <p className="text-xs font-bold opacity-80 uppercase tracking-wider">
                  {t('auth.requestNewVerification', 'Request a New Verification Link')}
                </p>
                <div>
                  <input
                    type="email"
                    value={resendEmail || user?.email || ''}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder={t('auth.email', 'Enter your registered email')}
                    className={inputClass}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={resending}
                  className={primaryBtn}
                >
                  {resending ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><FiSend size={16} /> {t('auth.resendVerification', 'Resend Verification Email')}</>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default VerifyEmail

