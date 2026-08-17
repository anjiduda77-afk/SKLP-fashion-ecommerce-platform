import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import axios from 'axios'
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

// Helper: Issue tokens & set login tracking on a user object, then return response payload
const issueAuthTokens = async (user, req) => {
  const token = generateToken(user)
  const refreshToken = generateRefreshToken(user)
  const { device, ip } = getDeviceInfo(req)
  await user.addRefreshToken(refreshToken, device, ip)

  user.lastLogin = new Date()
  user.lastLoginIP = ip
  user.lastLoginDevice = device
  await user.save()

  return { token, refreshToken }
}

export const register = async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body

  // Validate password strength
  if (password) {
    const { isValid, errors } = User.validatePasswordStrength(password)
    if (!isValid) {
      throw new ApiError(400, 'Password does not meet requirements', errors)
    }
  }

  // Build OR conditions for duplicate check
  const orConditions = []
  if (email) orConditions.push({ email: email.toLowerCase() })
  if (phone) orConditions.push({ phone })

  if (orConditions.length > 0) {
    const existingUser = await User.findOne({ $or: orConditions })
    if (existingUser) {
      throw new ApiError(409, 'Email or phone already registered')
    }
  }

  // Strictly enforce role = customer for public registration
  const userData = {
    firstName: firstName || 'Customer',
    lastName: lastName || 'User',
    email: email ? email.toLowerCase().trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    password,
    authProvider: 'email',
    role: 'customer',
  }

  // Generate email verification token if email provided
  if (email) {
    const verificationToken = crypto.randomBytes(32).toString('hex')
    userData.emailVerificationToken = verificationToken
    userData.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const user = await User.create(userData)
    const { token, refreshToken } = await issueAuthTokens(user, req)

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

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: user.toJSON(),
      token,
      refreshToken
    })
  }

  const user = await User.create(userData)
  const { token, refreshToken } = await issueAuthTokens(user, req)

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
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
  if (user.status === 'suspended' || user.status === 'blocked') {
    throw new ApiError(403, 'Your account has been suspended or blocked. Please contact support.')
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

// ──────────────────────────────────────────────────────────────────────────────
// GOOGLE LOGIN — Production Real OAuth & Unified Identity Resolution
// ──────────────────────────────────────────────────────────────────────────────
export const googleLogin = async (req, res) => {
  const { token, credential, accessToken } = req.body
  const googleAuthToken = credential || token || accessToken

  if (!googleAuthToken) {
    throw new ApiError(400, 'Google authentication token is required')
  }

  let email, firstName, lastName, googleId, avatarUrl

  const googleClientId = process.env.GOOGLE_CLIENT_ID

  // 1. If ID Token (credential/token) is provided and Google Client ID is configured, verify with Google Public Keys
  if (googleClientId && (credential || token)) {
    try {
      const client = new OAuth2Client(googleClientId)
      const ticket = await client.verifyIdToken({
        idToken: credential || token,
        audience: googleClientId
      })
      const payload = ticket.getPayload()
      if (payload && payload.email) {
        email = payload.email
        firstName = payload.given_name || payload.name?.split(' ')[0] || 'Google'
        lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'Customer'
        googleId = payload.sub
        avatarUrl = payload.picture || null
      }
    } catch (err) {
      console.warn('Google verifyIdToken note:', err.message)
    }
  }

  // 2. Query Google's OAuth2 userinfo endpoint (handles standard OAuth2 access_tokens and raw tokens)
  if (!email && googleAuthToken) {
    try {
      const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAuthToken}` }
      })
      if (googleRes.data && googleRes.data.email) {
        email = googleRes.data.email
        firstName = googleRes.data.given_name || googleRes.data.name?.split(' ')[0] || 'Google'
        lastName = googleRes.data.family_name || googleRes.data.name?.split(' ').slice(1).join(' ') || 'Customer'
        googleId = googleRes.data.sub
        avatarUrl = googleRes.data.picture || null
      }
    } catch (err) {
      console.warn('Google userinfo fetch note:', err.message)
    }
  }

  // 3. Strict Production Security: In production, unverified tokens are strictly blocked
  if (!email) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(401, 'Google authentication verification failed. Invalid or expired Google token.')
    }
    // Only in local development / unit testing when no Google credentials configured
    if (googleAuthToken.includes('@')) {
      email = googleAuthToken
      firstName = 'Google'
      lastName = 'Customer'
      googleId = 'google_dev_' + Math.random().toString(36).substring(2, 9)
    } else {
      throw new ApiError(401, 'Google authentication token could not be verified by Google servers.')
    }
  }

  const searchEmail = email.toLowerCase()

  // UNIFIED IDENTITY RESOLUTION:
  // 1. Check by googleId first
  // 2. Then check by email
  // 3. If found, link Google auth. If not, create new CUSTOMER account.
  let user = await User.findOne({ googleId })
  if (!user) {
    user = await User.findOne({ email: searchEmail })
  }

  if (user) {
    if (user.status === 'suspended' || user.status === 'blocked') {
      throw new ApiError(403, 'Your account has been suspended or blocked. Please contact support.')
    }
    if (user.status === 'deleted') {
      throw new ApiError(403, 'This account has been deleted.')
    }
    // Link Google identity to existing account
    if (!user.googleId) user.googleId = googleId
    if (!user.isEmailVerified) user.isEmailVerified = true
    if (avatarUrl && (!user.avatar || !user.avatar.url)) {
      user.avatar = { url: avatarUrl, publicId: null }
    }
    // Update name only if it was a placeholder
    if ((!user.firstName || user.firstName === 'Customer') && firstName) user.firstName = firstName
    if ((!user.lastName || user.lastName === 'User') && lastName) user.lastName = lastName
    await user.save()
  } else {
    // Create new unified account with role = 'customer'
    user = await User.create({
      firstName,
      lastName,
      email: searchEmail,
      phone: undefined,
      authProvider: 'google',
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: false,
      googleId,
      avatar: avatarUrl ? { url: avatarUrl, publicId: null } : undefined
    })
  }

  const { token: authToken, refreshToken: rToken } = await issueAuthTokens(user, req)

  res.status(200).json({
    success: true,
    message: 'Google login successful',
    user: user.toJSON(),
    token: authToken,
    refreshToken: rToken
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// MOBILE OTP — Unified Identity Resolution (Flipkart-style)
// ──────────────────────────────────────────────────────────────────────────────
export const sendOTP = async (req, res) => {
  const { phone } = req.body

  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    throw new ApiError(400, 'Please provide a valid 10-digit mobile number')
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  // Find or prepare — but do NOT create the user yet
  // User is created only after successful OTP verification (Flipkart-style)
  let user = await User.findOne({ phone })

  if (user) {
    // Rate-limit: gentle 10-second cooldown between consecutive OTP sends
    if (user.lastOtpSentAt && (Date.now() - user.lastOtpSentAt.getTime()) < 10000) {
      const waitSec = Math.ceil((10000 - (Date.now() - user.lastOtpSentAt.getTime())) / 1000)
      throw new ApiError(429, `Please wait ${waitSec} seconds before requesting another OTP`)
    }

    // Max resend protection: 20 per 5 minutes
    const timeSinceFirst = Date.now() - (user.lastOtpSentAt?.getTime() || 0)
    if (timeSinceFirst >= 5 * 60 * 1000) {
      user.phoneOtpResendCount = 0 // Reset after 5 minutes
    }

    if ((user.phoneOtpResendCount || 0) >= 20) {
      const waitMinutes = Math.ceil((5 * 60 * 1000 - timeSinceFirst) / 60000)
      throw new ApiError(429, `Maximum OTP limit (20) reached. It will be re-activated in ${waitMinutes > 0 ? waitMinutes : 1} minute(s).`)
    }

    user.phoneOtp = otp
    user.phoneOtpExpiry = otpExpiry
    user.phoneOtpAttempts = 0
    user.phoneOtpResendCount = (user.phoneOtpResendCount || 0) + 1
    user.lastOtpSentAt = new Date()
    await user.save()
  } else {
    // Store OTP temporarily for new user — create account only after verification
    // We create a minimal record to store OTP against the phone
    user = await User.create({
      phone,
      authProvider: 'otp',
      isPhoneVerified: false,
      isEmailVerified: false,
      phoneOtp: otp,
      phoneOtpExpiry: otpExpiry,
      phoneOtpAttempts: 0,
      phoneOtpResendCount: 1,
      lastOtpSentAt: new Date()
    })
  }

  // Send OTP via SMS (or mock in dev)
  await sendOTPMessage(phone, otp)

  res.status(200).json({
    success: true,
    message: 'OTP sent to phone number',
    expiresIn: 300, // 5 minutes in seconds
    resendAfter: 10  // 10 seconds cooldown
  })
}

export const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body

  if (!phone || !otp) {
    throw new ApiError(400, 'Phone number and OTP are required')
  }

  const user = await User.findOne({ phone })

  if (!user) {
    throw new ApiError(400, 'No OTP request found for this phone number')
  }

  // Check max verification attempts (up to 20 attempts per OTP / 5 minutes)
  if ((user.phoneOtpAttempts || 0) >= 20) {
    user.phoneOtp = undefined
    user.phoneOtpExpiry = undefined
    await user.save()
    throw new ApiError(429, 'Maximum verification attempts (20) exceeded. Please request a new OTP.')
  }

  // Check OTP expiry (5 minutes)
  if (!user.phoneOtpExpiry || user.phoneOtpExpiry < new Date()) {
    user.phoneOtp = undefined
    user.phoneOtpExpiry = undefined
    await user.save()
    throw new ApiError(410, 'OTP has expired (valid for 5 minutes). Please request a new one.')
  }

  // Verify OTP
  if (user.phoneOtp !== otp) {
    user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1
    await user.save()
    const remaining = 20 - user.phoneOtpAttempts
    throw new ApiError(400, `Invalid OTP. ${remaining} attempt(s) remaining before 5-minute timeout.`)
  }

  // OTP verified successfully
  if (user.status === 'suspended' || user.status === 'blocked') {
    throw new ApiError(403, 'Your account has been suspended or blocked. Please contact support.')
  }
  if (user.status === 'deleted') {
    throw new ApiError(403, 'This account has been deleted.')
  }

  user.isPhoneVerified = true
  user.phoneOtp = undefined
  user.phoneOtpExpiry = undefined
  user.phoneOtpAttempts = 0
  user.phoneOtpResendCount = 0

  // If this was a brand-new OTP-only user and name is still default, that's fine
  // The account is now verified and ready
  await user.save()

  const { token, refreshToken } = await issueAuthTokens(user, req)

  res.status(200).json({
    success: true,
    message: 'Phone number verified successfully',
    user: user.toJSON(),
    token,
    refreshToken,
    isNewUser: user.firstName === 'Customer' && !user.email
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
  user.passwordResetToken = resetToken
  user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
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
    passwordResetToken: token,
    passwordResetExpiry: { $gt: new Date() }
  })
  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token')
  }

  user.password = newPassword
  user.passwordResetToken = undefined
  user.passwordResetExpiry = undefined
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

// ──────────────────────────────────────────────────────────────────────────────
// ACCOUNT LINKING — Link phone/email to an existing authenticated account
// ──────────────────────────────────────────────────────────────────────────────

// Send OTP to link a new phone number to the authenticated user's account
export const sendLinkPhoneOTP = async (req, res) => {
  const { phone } = req.body
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    throw new ApiError(400, 'Please provide a valid 10-digit mobile number')
  }

  // Check if phone already belongs to another account
  const existingUser = await User.findOne({ phone, _id: { $ne: req.user.id } })
  if (existingUser) {
    throw new ApiError(409, 'This phone number is already associated with another account')
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')

  user.phoneOtp = otp
  user.phoneOtpExpiry = new Date(Date.now() + 5 * 60 * 1000)
  user.phoneOtpAttempts = 0
  user.lastOtpSentAt = new Date()
  await user.save()

  await sendOTPMessage(phone, otp)

  res.status(200).json({
    success: true,
    message: `OTP sent to +91 ${phone}`,
    expiresIn: 300
  })
}

// Verify OTP and link phone to authenticated user
export const verifyLinkPhone = async (req, res) => {
  const { phone, otp } = req.body
  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')

  if (!user.phoneOtpExpiry || user.phoneOtpExpiry < new Date()) {
    throw new ApiError(410, 'OTP has expired (valid for 5 minutes). Please request a new one.')
  }
  if ((user.phoneOtpAttempts || 0) >= 20) {
    user.phoneOtp = undefined
    user.phoneOtpExpiry = undefined
    await user.save()
    throw new ApiError(429, 'Maximum verification attempts (20) exceeded. Please request a new OTP.')
  }
  if (user.phoneOtp !== otp) {
    user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1
    await user.save()
    const remaining = 20 - user.phoneOtpAttempts
    throw new ApiError(400, `Invalid OTP. ${remaining} attempt(s) remaining before 5-minute timeout.`)
  }

  // Check again in case someone registered this phone in the meantime
  const existingUser = await User.findOne({ phone, _id: { $ne: req.user.id } })
  if (existingUser) {
    throw new ApiError(409, 'This phone number is already associated with another account')
  }

  user.phone = phone
  user.isPhoneVerified = true
  user.phoneOtp = undefined
  user.phoneOtpExpiry = undefined
  user.phoneOtpAttempts = 0
  await user.save()

  res.status(200).json({
    success: true,
    message: 'Phone number verified and linked to your account',
    user: user.toJSON()
  })
}

// Update/link email to authenticated user
export const linkEmail = async (req, res) => {
  const { email } = req.body
  if (!email) throw new ApiError(400, 'Email is required')

  const searchEmail = email.toLowerCase()
  const existingUser = await User.findOne({ email: searchEmail, _id: { $ne: req.user.id } })
  if (existingUser) {
    throw new ApiError(409, 'This email is already associated with another account')
  }

  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex')
  user.email = searchEmail
  user.isEmailVerified = false
  user.emailVerificationToken = verificationToken
  user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await user.save()

  try {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
    await sendEmail({
      to: searchEmail,
      subject: 'Verify Your Email — SKLP Fashion',
      text: `Verify your email by clicking: ${verifyUrl}`,
    })
  } catch (err) {
    console.warn('Link email verification send failed:', err.message)
  }

  res.status(200).json({
    success: true,
    message: 'Verification email sent. Please verify to complete linking.',
    user: user.toJSON()
  })
}
