import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { authService } from '@services/apiServices'
import { toast } from 'react-toastify'
import { FiPhone, FiArrowLeft, FiArrowRight, FiShield } from 'react-icons/fi'

function OTPLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const redirectUrl = new URLSearchParams(location.search).get('redirect') || null

  const [step, setStep] = useState(1) // 1: phone, 2: OTP
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpError, setOtpError] = useState('')
  const inputRefs = useRef([])

  const startCountdown = (seconds = 30) => {
    setCountdown(seconds)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '')
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number')
      return
    }
    setLoading(true)
    setOtpError('')
    try {
      await authService.sendOTP(cleanPhone)
      setStep(2)
      setOtp(['', '', '', '', '', ''])  // Always start blank — never pre-fill
      startCountdown(30)
      toast.success(`OTP sent to +91 ${cleanPhone.slice(0, 5)}XXXXX`)
      setTimeout(() => inputRefs.current[0]?.focus(), 200)
    } catch (error) {
      const msg = error?.response?.data?.message || 'Something went wrong. Please try again.'
      toast.error(msg)
      // Stay on step 1 — do NOT auto-fill or advance to OTP step on failure
    } finally {
      setLoading(false)
    }
  }

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setOtpError('')
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOTPPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length < 6) {
      setOtpError('Please enter the complete 6-digit OTP')
      return
    }
    setLoading(true)
    setOtpError('')
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      const response = await authService.verifyOTP(cleanPhone, otpString)
      await login(response.data.user, response.data.token, response.data.refreshToken)

      const user = response.data.user
      const role = (user?.role || '').toLowerCase()
      toast.success(`Welcome${user?.firstName && user.firstName !== 'Customer' ? `, ${user.firstName}` : ''}! 🎉`)

      const dest = redirectUrl || (role === 'admin' ? '/admin/dashboard' : role === 'seller' ? '/seller/dashboard' : role === 'delivery' ? '/delivery/dashboard' : '/')
      navigate(dest)
    } catch (error) {
      const msg = error?.response?.data?.message || 'Incorrect OTP. Please try again.'
      setOtpError(msg)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setOtpError('')
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      await authService.sendOTP(cleanPhone)
      setOtp(['', '', '', '', '', ''])
      startCountdown(30)
      toast.success('OTP resent to your mobile number')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend OTP. Please try again.')
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

          {/* Step 1: Phone */}
          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border-2 border-luxury-gold/30 flex items-center justify-center mx-auto mb-4">
                  <FiPhone size={28} className="text-luxury-gold" />
                </div>
                <h1 className="text-3xl font-serif font-bold mb-2">Mobile Login</h1>
                <p className="opacity-75 text-sm">Enter your mobile number to receive a one-time password</p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center gap-1 text-luxury-gold border-r border-luxury-mediumGray/30 pr-2">
                      <span className="text-sm font-semibold">+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98765 43210"
                      className="pl-14 w-full tracking-widest"
                      maxLength={10}
                      required
                      pattern="\d{10}"
                      autoFocus
                    />
                  </div>
                  {phone.length > 0 && phone.length < 10 && (
                    <p className="text-xs text-orange-400 mt-1">Enter complete 10-digit mobile number</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, '').length !== 10}
                  className="w-full py-3 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all duration-200 hover:shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Sending OTP... <FiArrowRight /></>
                  )}
                  {!loading && 'Continue'}
                </button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border-2 border-luxury-gold/30 flex items-center justify-center mx-auto mb-4">
                  <FiShield size={28} className="text-luxury-gold" />
                </div>
                <h1 className="text-2xl font-serif font-bold mb-2">Enter OTP</h1>
                <p className="opacity-75 text-sm">
                  We sent a 6-digit code to{' '}
                  <span className="text-luxury-gold font-semibold">
                    +91 {phone.replace(/\D/g, '').slice(0, 5)}XXXXX
                  </span>
                </p>
                <button
                  onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setOtpError('') }}
                  className="text-xs text-luxury-mediumGray hover:text-luxury-gold mt-1 transition-colors underline underline-offset-2"
                >
                  Change number
                </button>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                {/* OTP Boxes */}
                <div className="flex justify-center gap-3" onPaste={handleOTPPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(index, e)}
                      className={`w-12 h-12 text-center text-xl font-bold rounded-xl border-2 bg-transparent outline-none transition-all duration-200
                        ${digit
                          ? 'border-luxury-gold text-luxury-gold shadow-glow'
                          : 'border-luxury-mediumGray/30 hover:border-luxury-mediumGray'
                        } ${otpError ? 'border-red-500' : ''}`}
                    />
                  ))}
                </div>

                {/* Error message */}
                {otpError && (
                  <p className="text-center text-sm text-red-400 font-medium">{otpError}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  className="w-full py-3 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all duration-200 hover:shadow-glow disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Login'
                  )}
                </button>

                {/* Resend */}
                <p className="text-center text-sm opacity-75">
                  Didn't receive the OTP?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0}
                    className={`font-semibold transition-colors ${
                      countdown > 0
                        ? 'text-luxury-mediumGray cursor-not-allowed'
                        : 'text-luxury-gold hover:underline'
                    }`}
                  >
                    {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                  </button>
                </p>
              </form>
            </>
          )}

          {/* Footer */}
          <p className="text-center mt-6 text-sm opacity-75">
            New here?{' '}
            <Link to="/register" className="text-luxury-gold font-semibold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default OTPLogin
