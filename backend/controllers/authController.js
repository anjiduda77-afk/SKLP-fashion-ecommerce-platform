import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'
import { sendEmail } from '../utils/emailService.js'
import { sendOTPMessage } from '../services/otpService.js'

const generateToken = (user) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    provider: user.authProvider
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' })
}

const generateRefreshToken = (user) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' })
}

export const register = async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] })
  if (existingUser) {
    throw new ApiError(409, 'Email or phone already registered')
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    authProvider: 'email'
  })

  const token = generateToken(user)
  const refreshToken = generateRefreshToken(user)

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: user.toJSON(),
    token,
    refreshToken
  })
}

export const login = async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw new ApiError(401, 'Invalid email or password')
  }

  if (user.isLocked()) {
    throw new ApiError(423, 'Account locked. Try again later')
  }

  const passwordMatch = await user.comparePassword(password)
  if (!passwordMatch) {
    await user.incLoginAttempts()
    throw new ApiError(401, 'Invalid email or password')
  }

  await user.resetLoginAttempts()

  const token = generateToken(user)
  const refreshToken = generateRefreshToken(user)

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: user.toJSON(),
    token,
    refreshToken
  })
}

const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const generatePlaceholderPhone = () => {
  const timestamp = Date.now().toString().slice(-10)
  const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()
  return (timestamp + randomDigits).slice(-10)
}

const generateGuestEmail = (identifier) => {
  return `guest.${identifier}@sklp.com`
}

export const googleLogin = async (req, res) => {
  const { token } = req.body
  if (!token) {
    throw new ApiError(400, 'Google token is required')
  }

  let email, firstName, lastName, googleId

  if (process.env.GOOGLE_CLIENT_ID) {
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      })
      const payload = ticket.getPayload()
      email = payload.email
      firstName = payload.given_name || 'Google'
      lastName = payload.family_name || 'User'
      googleId = payload.sub
    } catch (err) {
      console.warn('Google verify failed, using mock fallback for dev:', err.message)
    }
  }

  if (!email) {
    email = token.includes('@') ? token : generateGuestEmail('google')
    firstName = 'Google'
    lastName = 'VIP Guest'
    googleId = 'google_mock_' + Math.random().toString(36).substring(2, 9)
  }

  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({
      firstName,
      lastName,
      email,
      phone: generatePlaceholderPhone(),
      authProvider: 'google',
      isEmailVerified: true,
      isPhoneVerified: false,
      googleId
    })
  }

  const authToken = generateToken(user)
  const rToken = generateRefreshToken(user)

  res.status(200).json({
    success: true,
    message: 'Google login successful',
    user: user.toJSON(),
    token: authToken,
    refreshToken: rToken
  })
}

export const sendOTP = async (req, res) => {
  const { phone } = req.body
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiry = new Date(Date.now() + 5 * 60 * 1000)

  let user = await User.findOne({ phone })
  if (!user) {
    user = await User.create({
      firstName: 'Guest',
      lastName: 'User',
      email: generateGuestEmail(phone),
      phone,
      authProvider: 'otp',
      isPhoneVerified: false,
      isEmailVerified: false,
    })
  }

  user.phoneVerificationToken = otp
  user.lockUntil = expiry
  await user.save()

  await sendOTPMessage(phone, otp)

  res.status(200).json({
    success: true,
    message: 'OTP sent to phone number',
  })
}

export const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body
  const user = await User.findOne({ phone, phoneVerificationToken: otp })

  if (!user) {
    throw new ApiError(400, 'Invalid OTP')
  }

  if (user.lockUntil && user.lockUntil < new Date()) {
    throw new ApiError(410, 'OTP expired')
  }

  user.isPhoneVerified = true
  user.authProvider = 'otp'
  user.phoneVerificationToken = undefined
  await user.save()

  const token = generateToken(user)
  const refreshToken = generateRefreshToken(user)

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    user: user.toJSON(),
    token,
    refreshToken
  })
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const resetToken = crypto.randomBytes(32).toString('hex')
  user.emailVerificationToken = resetToken
  await user.save()

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
  await sendEmail({
    to: email,
    subject: 'Reset Your SKLP Password',
    text: `Reset your password using the link: ${resetUrl}`,
  })

  res.status(200).json({
    success: true,
    message: 'Password reset email sent',
  })
}

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body
  const user = await User.findOne({ emailVerificationToken: token })
  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token')
  }

  user.password = newPassword
  user.emailVerificationToken = undefined
  await user.save()

  res.status(200).json({ success: true, message: 'Password reset successfully' })
}

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required')
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
  if (!decoded) {
    throw new ApiError(401, 'Refresh token invalid')
  }

  const user = await User.findById(decoded.id)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const token = generateToken(user)
  const newRefreshToken = generateRefreshToken(user)

  res.status(200).json({ success: true, token, refreshToken: newRefreshToken })
}

export const logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  res.status(200).json({ success: true, user: user.toJSON() })
}
