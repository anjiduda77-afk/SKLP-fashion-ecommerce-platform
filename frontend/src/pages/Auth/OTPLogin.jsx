import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { authService } from '@services/apiServices'
import { toast } from 'react-toastify'
import { FiPhone, FiArrowLeft, FiArrowRight } from 'react-icons/fi'

function OTPLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(1) // 1: phone, 2: OTP
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef([])

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.sendOTP(phone)
      setStep(2)
      startCountdown()
      toast.success(`OTP sent to ${phone}`)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    // Auto focus next
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
      toast.error('Please enter the complete 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const response = await authService.verifyOTP(phone, otpString)
      login(response.data.user, response.data.token)
      toast.success('Welcome to SKLP! 🎉')
      navigate('/')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    try {
      await authService.sendOTP(phone)
      startCountdown()
      setOtp(['', '', '', '', '', ''])
      toast.success('OTP resent!')
    } catch {
      toast.error('Failed to resend OTP')
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
                <h1 className="text-3xl font-serif font-bold mb-2">OTP Login</h1>
                <p className="opacity-75 text-sm">Enter your mobile number to receive an OTP</p>
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
                    />
                  </div>
                  {phone.length > 0 && phone.length < 10 && (
                    <p className="text-xs text-orange-400 mt-1">Enter 10-digit mobile number</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  className="w-full py-3 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all duration-200 hover:shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Send OTP <FiArrowRight /></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border-2 border-luxury-gold/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h1 className="text-3xl font-serif font-bold mb-2">Enter OTP</h1>
                <p className="opacity-75 text-sm">
                  We sent a 6-digit code to{' '}
                  <span className="text-luxury-gold font-semibold">+91 {phone}</span>
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-luxury-mediumGray hover:text-luxury-gold mt-1 transition-colors"
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
                        }`}
                    />
                  ))}
                </div>

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
                  Didn't receive code?{' '}
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
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
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
