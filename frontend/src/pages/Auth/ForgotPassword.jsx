import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '@services/apiServices'
import { toast } from 'react-toastify'
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  const startCountdown = () => {
    setResendCountdown(60)
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
      startCountdown()
      toast.success('Reset link sent to your email!')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not send reset link. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCountdown > 0) return
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      startCountdown()
      toast.success('Reset link resent!')
    } catch {
      toast.error('Failed to resend. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 animate-fade-in">
          {/* Back */}
          <Link
            to="/login"
            className="flex items-center gap-2 text-sm text-luxury-mediumGray hover:text-luxury-gold transition-colors mb-6"
          >
            <FiArrowLeft size={16} />
            Back to Login
          </Link>

          {!sent ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border-2 border-luxury-gold/30 flex items-center justify-center mx-auto mb-4">
                  <FiMail size={28} className="text-luxury-gold" />
                </div>
                <h1 className="text-3xl font-serif font-bold mb-2">Forgot Password?</h1>
                <p className="opacity-75 text-sm">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-3 text-luxury-gold" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-9 w-full"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all duration-200 hover:shadow-glow disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle size={36} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-3">Check Your Email</h2>
              <p className="opacity-75 text-sm mb-2">We sent a password reset link to:</p>
              <p className="text-luxury-gold font-semibold mb-6">{email}</p>
              <p className="text-xs opacity-60 mb-6">
                Didn't receive it? Check your spam folder or resend below.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || loading}
                  className="w-full py-2.5 border-2 border-luxury-gold/50 rounded-xl hover:border-luxury-gold hover:bg-luxury-gold/10 transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Email'}
                </button>
                <Link
                  to="/login"
                  className="block w-full py-2.5 text-center text-sm opacity-75 hover:opacity-100 hover:text-luxury-gold transition-colors"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
