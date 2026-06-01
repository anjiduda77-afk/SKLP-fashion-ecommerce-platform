import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { authService } from '@services/apiServices'
import { toast } from 'react-toastify'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi'

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special char', pass: /[!@#$%^&*]/.test(password) },
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
              i < strength ? colors[strength - 1] : 'bg-luxury-darkGray'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(({ label, pass }) => (
          <span
            key={label}
            className={`text-xs flex items-center gap-1 transition-colors ${
              pass ? 'text-green-400' : 'text-luxury-mediumGray'
            }`}
          >
            <FiCheckCircle size={11} />
            {label}
          </span>
        ))}
        <span className={`text-xs font-semibold ml-auto ${colors[strength - 1]?.replace('bg-', 'text-')}`}>
          {strength > 0 ? labels[strength - 1] : ''}
        </span>
      </div>
    </div>
  )
}

function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!formData.agreeTerms) {
      toast.error('Please accept the terms & conditions')
      return
    }
    setLoading(true)
    try {
      const response = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      })
      login(response.data.user, response.data.token)
      toast.success('Account created! Welcome to SKLP 🎉')
      navigate('/')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="card p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif font-bold text-luxury-gold mb-2">Join SKLP</h1>
            <p className="opacity-75">Create your premium fashion account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">First Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-3 text-luxury-gold" size={16} />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    className="pl-9 w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Last Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-3 text-luxury-gold" size={16} />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    className="pl-9 w-full"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="pl-9 w-full"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center gap-1 text-luxury-gold border-r border-luxury-mediumGray/30 pr-2">
                  <span className="text-sm font-semibold">+91</span>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="98765 43210"
                  className="pl-14 w-full tracking-widest"
                  maxLength={10}
                  required
                  pattern="\d{10}"
                />
              </div>
              {formData.phone.length > 0 && formData.phone.length < 10 && (
                <p className="text-xs text-orange-400 mt-1">Enter 10-digit mobile number</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="pl-9 pr-10 w-full"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-luxury-mediumGray hover:text-luxury-gold transition-colors"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              <PasswordStrength password={formData.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold mb-2">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-luxury-gold" size={16} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={`pl-9 pr-10 w-full ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-500'
                      : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-luxury-mediumGray hover:text-luxury-gold transition-colors"
                >
                  {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="mt-0.5 accent-yellow-400"
              />
              <span className="text-sm opacity-75">
                I agree to the{' '}
                <span className="text-luxury-gold hover:underline cursor-pointer">Terms of Service</span>{' '}
                and{' '}
                <span className="text-luxury-gold hover:underline cursor-pointer">Privacy Policy</span>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-luxury-gold text-luxury-black font-bold rounded-xl hover:bg-luxury-darkGold transition-all duration-200 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-luxury-black border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-luxury-mediumGray/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-luxury-offWhite dark:bg-luxury-charcoal opacity-75">Or sign up with</span>
            </div>
          </div>

          {/* Google */}
          <button className="w-full py-2.5 border-2 border-luxury-gold/50 rounded-xl hover:border-luxury-gold hover:bg-luxury-gold hover:text-luxury-black transition-all duration-200 font-semibold text-sm">
            🔍  Continue with Google
          </button>

          {/* Login Link */}
          <p className="text-center mt-6 text-sm opacity-75">
            Already have an account?{' '}
            <Link to="/login" className="text-luxury-gold font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
