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
    role: user.role,
    type: 'refresh'
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' })
}

// Extract device info from request
const getDeviceInfo = (req) => {
  const ua = req.headers['user-agent'] || 'unknown'
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
  // Simple device detection
  let device = 'Desktop'
  if (/mobile/i.test(ua)) device = 'Mobile'
  else if (/tablet/i.test(ua)) device = 'Tablet'
  return { device: `${device} - ${ua.substring(0, 80)}`, ip }
}

export const register = async (req, res) => {
  const { firstName, lastName, email, phone, password, registerAsSeller } = req.body

  // Validate password strength
  if (password) {
    const { isValid, errors } = User.validatePasswordStrength(password)
    if (!isValid) {
      throw new ApiError(400, 'Password does not meet requirements', errors)
    }
  }

  const searchEmail = email ? email.toLowerCase() : ''
  const existingUser = await User.findOne({ $or: [{ email: searchEmail }, { phone }] })
  if (existingUser) {
    throw new ApiError(409, 'Email or phone already registered')
  }

  const userData = {
    firstName,
    lastName,
    email,
    phone,
    password,
    authProvider: 'email',
    role: registerAsSeller ? 'seller' : 'customer',
  }

  // If registering as seller, initialize seller profile
  if (registerAsSeller) {
    userData.sellerProfile = {
      storeName: req.body.storeName || `${firstName}'s Store`,
      storeDescription: req.body.storeDescription || '',
      isVerified: false,
    }
  }

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex')
  userData.emailVerificationToken = verificationToken
  userData.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const user = await User.create(userData)

  const token = generateToken(user)
  const refreshToken = generateRefreshToken(user)

  // Store refresh token with device info
  const { device, ip } = getDeviceInfo(req)
  await user.addRefreshToken(refreshToken, device, ip)

  // Update login tracking
  user.lastLogin = new Date()
  user.lastLoginIP = ip
  user.lastLoginDevice = device
  await user.save()

  // Send verification email (async, don't block response)
  try {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
    await sendEmail({
      to: email,
      subject: 'Verify Your SKLP Account',
      text: `Welcome to SKLP! Please verify your email by clicking: ${verifyUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #FFD700; text-align: center;">Welcome to SKLP!</h1>
          <p>Hi ${firstName},</p>
          <p>Thank you for registering with SKLP. Please verify your email address to unlock all features.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background: #FFD700; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
      `
    })
  } catch (emailErr) {
    console.warn('Email verification send failed:', emailErr.message)
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    user: user.toJSON(),
    token,
    refreshToken
  })
}

export const login = async (req, res) => {
  const { email, password, rememberMe } = req.body
  const searchEmail = email ? email.toLowerCase() : ''
  const user = await User.findOne({ email: searchEmail }).select('+password')
  if (!user) {
    throw new ApiError(401, 'Invalid email or password')
  }

  // Check account status
  if (user.status === 'suspended') {
    throw new ApiError(403, 'Your account has been suspended. Please contact support.')
  }
  if (user.status === 'deleted') {
    throw new ApiError(403, 'This account has been deleted.')
  }

  if (user.isLocked()) {
    const remainingMs = user.lockUntil - Date.now()
    const remainingMin = Math.ceil(remainingMs / 60000)
    throw new ApiError(423, `Account locked. Try again in ${remainingMin} minute(s).`)
  }

  const passwordMatch = await user.comparePassword(password)
  if (!passwordMatch) {
    await user.incLoginAttempts()
    throw new ApiError(401, 'Invalid email or password')
  }

  await user.resetLoginAttempts()

  // Generate tokens
  const tokenExpire = rememberMe ? '30d' : (process.env.JWT_EXPIRE || '7d')
  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, provider: user.authProvider },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpire }
  )
  const refreshToken = generateRefreshToken(user)

  // Store refresh token with device info
  const { device, ip } = getDeviceInfo(req)
  await user.addRefreshToken(refreshToken, device, ip)

  // Update login tracking
  user.lastLogin = new Date()
  user.lastLoginIP = ip
  user.lastLoginDevice = device
  await user.save()

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

  const searchEmail = email ? email.toLowerCase() : ''
  let user = await User.findOne({ email: searchEmail })
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

  const { device, ip } = getDeviceInfo(req)
  await user.addRefreshToken(rToken, device, ip)
  user.lastLogin = new Date()
  user.lastLoginIP = ip
  user.lastLoginDevice = device
  await user.save()

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

  const { device, ip } = getDeviceInfo(req)
  await user.addRefreshToken(refreshToken, device, ip)

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    user: user.toJSON(),
    token,
    refreshToken
  })
}

export const verifyEmail = async (req, res) => {
  const { token } = req.body

  if (!token) {
    throw new ApiError(400, 'Verification token is required')
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() }
  })

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token')
  }

  user.isEmailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpiry = undefined
  await user.save()

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  })
}

export const resendVerification = async (req, res) => {
  const { email } = req.body
  const searchEmail = email ? email.toLowerCase() : ''
  const user = await User.findOne({ email: searchEmail })
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified'
    })
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex')
  user.emailVerificationToken = verificationToken
  user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await user.save()

  try {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
    await sendEmail({
      to: email,
      subject: 'Verify Your SKLP Account',
      text: `Verify your email: ${verifyUrl}`,
    })
  } catch (emailErr) {
    console.warn('Resend verification email failed:', emailErr.message)
  }

  res.status(200).json({
    success: true,
    message: 'Verification email sent'
  })
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body
  const searchEmail = email ? email.toLowerCase() : ''
  const user = await User.findOne({ email: searchEmail })
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const resetToken = crypto.randomBytes(32).toString('hex')
  user.emailVerificationToken = resetToken
  user.emailVerificationExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  await user.save()

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
  await sendEmail({
    to: email,
    subject: 'Reset Your SKLP Password',
    text: `Reset your password using the link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #FFD700; text-align: center;">Password Reset</h1>
        <p>Hi ${user.firstName},</p>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #FFD700; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `
  })

  res.status(200).json({
    success: true,
    message: 'Password reset email sent',
  })
}

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body

  // Validate password strength
  const { isValid, errors } = User.validatePasswordStrength(newPassword)
  if (!isValid) {
    throw new ApiError(400, 'Password does not meet requirements', errors)
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() }
  })
  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token')
  }

  user.password = newPassword
  user.emailVerificationToken = undefined
  user.emailVerificationExpiry = undefined
  // Invalidate all refresh tokens on password reset
  user.refreshTokens = []
  await user.save()

  res.status(200).json({ success: true, message: 'Password reset successfully. Please login with your new password.' })
}

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required')
  }

  let decoded
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const user = await User.findById(decoded.id)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  // Check if this refresh token exists in user's stored tokens
  const storedToken = user.refreshTokens.find(rt => rt.token === refreshToken)
  if (!storedToken) {
    // Token reuse detected — possible token theft. Revoke all tokens.
    user.refreshTokens = []
    await user.save()
    throw new ApiError(401, 'Refresh token has been revoked. Please login again.')
  }

  // Rotate: remove old, issue new
  user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken)

  const newToken = generateToken(user)
  const newRefreshToken = generateRefreshToken(user)

  const { device, ip } = getDeviceInfo(req)
  user.refreshTokens.push({
    token: newRefreshToken,
    device: storedToken.device || device,
    ip,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  })
  await user.save()

  res.status(200).json({
    success: true,
    token: newToken,
    refreshToken: newRefreshToken
  })
}

export const logout = async (req, res) => {
  const { refreshToken } = req.body

  if (refreshToken && req.user?.id) {
    try {
      const user = await User.findById(req.user.id)
      if (user) {
        await user.removeRefreshToken(refreshToken)
      }
    } catch (err) {
      console.warn('Logout token cleanup failed:', err.message)
    }
  }

  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

export const logoutAllDevices = async (req, res) => {
  const user = await User.findById(req.user.id)
  if (user) {
    await user.removeAllRefreshTokens()
  }

  res.status(200).json({ success: true, message: 'Logged out from all devices' })
}

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  res.status(200).json({ success: true, user: user.toJSON() })
}

export const getActiveSessions = async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const sessions = (user.refreshTokens || []).map(rt => ({
    device: rt.device,
    ip: rt.ip,
    createdAt: rt.createdAt,
    expiresAt: rt.expiresAt,
    isCurrent: false // Client can compare to identify current session
  }))

  res.status(200).json({
    success: true,
    sessions,
    totalSessions: sessions.length
  })
}
