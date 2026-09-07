import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import axios from 'axios'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js'
import { sendEmail } from '../utils/emailService.js'

// Normalize Indian mobile number (+91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX -> 10 digits)
export const normalizeIndianPhone = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return null
  const digits = rawPhone.replace(/\D/g, '')
  const clean10 = digits.slice(-10)
  if (/^[0-9]{10}$/.test(clean10)) {
    return clean10
  }
  return null
}

// Hash OTP with SHA-256 — OTP stored as hash, never plain text
const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex')

const JWT_SECRET = process.env.JWT_SECRET || 'sklp_fashion_key_anji7206'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '1b5bc5004ff832818fb5099e47e098765d8a5913048d028f8dabcb39ee649c8735d88a2d8084da7e1bcac6be2a735d1b6cffef78be668597b84fe9564b1f7976'

const generateToken = (user, customExpire) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    provider: user.authProvider
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: customExpire || process.env.JWT_EXPIRE || '7d' })
}

const generateRefreshToken = (user) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    type: 'refresh'
  }
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' })
}

// Extract device info from request
const getDeviceInfo = (req) => {
  const ua = req?.headers?.['user-agent'] || 'unknown'
  const ip = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || 'unknown'
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
  console.log('[BACKEND] Registration request received')
  const { firstName, lastName, email, phone, password } = req.body

  const cleanEmail = email ? email.toLowerCase().trim() : null
  const cleanPhone = phone ? normalizeIndianPhone(phone) : null

  console.log(`[BACKEND] Request payload fields: firstName=${Boolean(firstName)}, lastName=${Boolean(lastName)}, email=${Boolean(cleanEmail)}, phone=${Boolean(cleanPhone)}, hasPassword=${Boolean(password)}`)

  if (!cleanEmail && !cleanPhone) {
    throw new ApiError(400, 'Please provide an email address or mobile phone number to register')
  }

  // Validate password strength
  if (password) {
    const { isValid, errors } = User.validatePasswordStrength(password)
    if (!isValid) {
      console.log('[BACKEND] Request validation failed: Password does not meet requirements')
      throw new ApiError(400, 'Password does not meet requirements', errors)
    }
  } else {
    throw new ApiError(400, 'Password is required for registration')
  }
  console.log('[BACKEND] Request validation passed')

  // Build OR conditions for duplicate check
  const orConditions = []
  if (cleanEmail) orConditions.push({ email: cleanEmail })
  if (cleanPhone) orConditions.push({ phone: cleanPhone })

  if (orConditions.length > 0) {
    console.log('[MONGODB] Searching for duplicate user')
    const existingUser = await User.findOne({ $or: orConditions })
    console.log(`[MONGODB] Duplicate check result: ${existingUser ? 'EXISTS' : 'NONE'}`)
    if (existingUser) {
      if (cleanEmail && existingUser.email === cleanEmail) {
        throw new ApiError(409, 'An account with this email address already exists. Please sign in or use Continue with Google.')
      }
      if (cleanPhone && existingUser.phone === cleanPhone) {
        throw new ApiError(409, 'An account with this mobile phone number already exists. Please sign in.')
      }
      throw new ApiError(409, 'Email or phone already registered. Please sign in.')
    }
  }

  // Strictly enforce role = customer for public registration
  const userData = {
    firstName: firstName && firstName.trim() ? firstName.trim() : 'Customer',
    lastName: lastName && lastName.trim() ? lastName.trim() : 'User',
    password,
    authProvider: 'email',
    role: 'customer',
    status: 'active',
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true
  }

  if (cleanEmail) userData.email = cleanEmail
  if (cleanPhone) userData.phone = cleanPhone

  console.log('[MONGODB] User.create reached')
  let user
  try {
    user = await User.create(userData)
    console.log(`[MONGODB] User created successfully: ID ${user._id}`)
  } catch (createErr) {
    console.error(`[MONGODB] Save failed: ${createErr.message}`)
    if (createErr.code === 11000) {
      // Check if collision was on customUserId, retry with new random ID
      if (createErr.keyPattern?.customUserId || createErr.message?.includes('customUserId')) {
        userData.customUserId = `USER_${Date.now().toString().slice(-4)}${Math.floor(10000 + Math.random() * 90000)}`
        user = await User.create(userData)
      } else if (createErr.keyPattern?.email || createErr.message?.includes('email')) {
        throw new ApiError(409, 'An account with this email address already exists. Please sign in.')
      } else if (createErr.keyPattern?.phone || createErr.message?.includes('phone')) {
        throw new ApiError(409, 'An account with this mobile phone number already exists. Please sign in.')
      } else {
        throw new ApiError(409, 'An account with these details already exists. Please sign in.')
      }
    } else {
      throw createErr
    }
  }

  // Generate email verification token if email provided
  if (cleanEmail) {
    const verificationToken = crypto.randomBytes(32).toString('hex')
    user.emailVerificationToken = verificationToken
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const { token, refreshToken } = await issueAuthTokens(user, req)
    console.log('[MONGODB] Save successful: YES')

    // Send verification email (async, don't block response)
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`
    sendEmail({
      to: cleanEmail,
      subject: 'Verify Your SKLP Account',
      text: `Welcome to SKLP! Please verify your email by clicking: ${verifyUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #FFD700; text-align: center;">Welcome to SKLP!</h1>
          <p>Hi ${user.firstName || 'Customer'},</p>
          <p>Thank you for registering with SKLP Fashion. Please verify your email address to unlock all luxury features.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background: #FFD700; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
      `
    }).catch(emailErr => console.warn('Email verification send failed:', emailErr.message))

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Welcome to SKLP Fashion!',
      user: user.toJSON(),
      token,
      refreshToken
    })
  }

  const { token, refreshToken } = await issueAuthTokens(user, req)
  console.log('[MONGODB] Save successful: YES')

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Welcome to SKLP Fashion!',
    user: user.toJSON(),
    token,
    refreshToken
  })
}

export const login = async (req, res) => {
  const { email, password, rememberMe } = req.body
  const searchEmail = email ? email.toLowerCase().trim() : ''
  if (!searchEmail) {
    throw new ApiError(400, 'Please enter your email address')
  }
  if (!password) {
    throw new ApiError(400, 'Please enter your password')
  }

  const user = await User.findOne({ email: searchEmail }).select('+password')
  if (!user) {
    throw new ApiError(401, 'Invalid email or password. Please check your credentials or register a new account.')
  }

  // Informative hint if account exists without password (e.g., registered via Google)
  if (!user.password) {
    throw new ApiError(400, 'This account was created using Google Sign-In. Please click "Continue with Google" or use Forgot Password to set a password.')
  }

  // Check account status
  if (user.status === 'suspended' || user.status === 'blocked') {
    throw new ApiError(403, 'Your account has been suspended or blocked. Please contact customer support.')
  }
  if (user.status === 'deleted') {
    throw new ApiError(403, 'This account has been deleted.')
  }

  if (user.isLocked()) {
    const remainingMs = user.lockUntil - Date.now()
    const remainingMin = Math.ceil(remainingMs / 60000)
    throw new ApiError(423, `Account temporarily locked due to failed attempts. Try again in ${remainingMin} minute(s).`)
  }

  const passwordMatch = await user.comparePassword(password)
  if (!passwordMatch) {
    await user.incLoginAttempts()
    throw new ApiError(401, 'Invalid email or password')
  }

  await user.resetLoginAttempts()

  // Generate tokens
  const tokenExpire = rememberMe ? '30d' : (process.env.JWT_EXPIRE || '7d')
  const token = generateToken(user, tokenExpire)
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
    throw new ApiError(401, 'Google sign-in was unsuccessful. Please try again.')
  }

  const searchEmail = email.toLowerCase().trim()

  // UNIFIED IDENTITY RESOLUTION:
  // 1. Check by googleId first
  // 2. Then check by email
  // 3. If found, preserve existing database role and link Google auth. If not, create new account as customer.
  let user = await User.findOne({ googleId })
  if (!user && searchEmail) {
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
    // New public registration strictly defaults to 'customer'
    user = await User.create({
      firstName: firstName || 'Customer',
      lastName: lastName || 'User',
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
// FIREBASE AUTHENTICATION (PHONE OTP & GOOGLE) — Verified Identity Resolution
// ──────────────────────────────────────────────────────────────────────────────
export const firebaseLogin = async (req, res) => {
  console.log('[AUTH] Firebase login request received')

  const authHeader = req.headers.authorization
  const idToken = req.body.idToken || req.body.token || req.body.credential || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null)

  if (!idToken) {
    console.warn('[AUTH] Missing Firebase ID Token in request')
    throw new ApiError(400, 'Firebase ID Token is required')
  }

  let decodedToken
  try {
    decodedToken = await verifyFirebaseIdToken(idToken)
    console.log('[AUTH] Firebase token verified successfully')
  } catch (err) {
    console.warn('[AUTH] Firebase Token Verification failed:', err.message)
    throw new ApiError(401, 'Invalid or expired Firebase authentication token')
  }

  const { uid, email, name, picture, phone_number } = decodedToken

  if (!email && !uid && !phone_number) {
    console.warn('[AUTH] Verified identity or UID missing from Firebase token')
    throw new ApiError(400, 'Verified identity or UID missing from Firebase token')
  }

  const searchEmail = email ? email.toLowerCase().trim() : null
  const cleanPhone = phone_number ? normalizeIndianPhone(phone_number) : null

  if (phone_number) {
    console.log(`[AUTH] Verified phone received: ${cleanPhone ? `+91 ${cleanPhone.slice(0, 3)}***${cleanPhone.slice(-3)}` : 'format normalized'}`)
  }
  if (email) {
    console.log(`[AUTH] Verified email received: ${searchEmail ? `${searchEmail.slice(0, 3)}***@${searchEmail.split('@')[1]}` : ''}`)
  }

  console.log(`[MONGODB] Connected database name: ${User.db?.name || 'sklp_db'}`)
  console.log(`[MONGODB] User collection: ${User.collection.name}`)

  // Resolve user: search by firebaseUid OR email OR verified phone
  const query = []
  if (uid) query.push({ firebaseUid: uid })
  if (searchEmail) query.push({ email: searchEmail })
  if (cleanPhone) query.push({ phone: cleanPhone })

  if (query.length === 0) {
    throw new ApiError(400, 'No searchable identity in verified Firebase token')
  }

  console.log('[MONGODB] Searching for user')
  let user = await User.findOne({ $or: query })
  console.log(`[MONGODB] Existing user: ${user ? 'YES' : 'NO'}`)

  // Parse first and last name from display name
  let firstName = 'Customer'
  let lastName = 'User'
  if (name) {
    const parts = name.trim().split(' ')
    firstName = parts[0] || 'Customer'
    lastName = parts.slice(1).join(' ') || 'User'
  }

  const determinedProvider = phone_number && !searchEmail ? 'firebase' : (searchEmail ? 'google' : 'firebase')

  if (user) {
    // Check account status
    if (user.status === 'suspended' || user.status === 'blocked') {
      throw new ApiError(403, 'Your account has been suspended or blocked. Please contact support.')
    }
    if (user.status === 'deleted') {
      throw new ApiError(403, 'This account has been deleted.')
    }

    // Link Firebase UID and profile details if not already linked
    if (uid && user.firebaseUid !== uid) {
      user.firebaseUid = uid
    }
    if (cleanPhone && !user.phone) {
      user.phone = cleanPhone
    }
    if (searchEmail && !user.email) {
      user.email = searchEmail
    }
    if (cleanPhone || phone_number) {
      user.isPhoneVerified = true
    }
    if (decodedToken.email_verified || searchEmail) {
      user.isEmailVerified = true
    }
    if (picture && (!user.avatar || !user.avatar.url)) {
      user.avatar = { url: picture, publicId: null }
    }
    if ((!user.firstName || user.firstName === 'Customer') && firstName !== 'Customer') {
      user.firstName = firstName
    }
    if ((!user.lastName || user.lastName === 'User') && lastName !== 'User') {
      user.lastName = lastName
    }

    // Preserve existing application user role from the database record (ADMIN stays ADMIN, CUSTOMER stays CUSTOMER)
    user.authProvider = user.authProvider || determinedProvider
    try {
      await user.save()
    } catch (saveErr) {
      console.warn('[AUTH] Warning saving linked Firebase identity details:', saveErr.message)
      if (saveErr.code === 11000) {
        user = await User.findById(user._id)
      } else {
        throw saveErr
      }
    }
  } else {
    // For newly registered users: default role is strictly CUSTOMER.
    // Only server-configured admin bootstrap UID can assign ADMIN role.
    const serverAdminUid = process.env.ADMIN_FIREBASE_UID?.trim()
    const isServerConfiguredAdmin = Boolean(serverAdminUid && uid && uid === serverAdminUid)
    const assignedRole = isServerConfiguredAdmin ? 'admin' : 'customer'

    console.log('[MONGODB] New user creation started, role:', assignedRole)
    console.log('[MONGODB] User.create called')

    try {
      user = await User.create({
        firstName,
        lastName,
        email: searchEmail || undefined,
        phone: cleanPhone || undefined,
        firebaseUid: uid || undefined,
        authProvider: determinedProvider,
        role: assignedRole,
        status: 'active',
        isActive: true,
        isEmailVerified: Boolean(decodedToken.email_verified || searchEmail),
        isPhoneVerified: Boolean(cleanPhone || phone_number),
        avatar: picture ? { url: picture, publicId: null } : undefined
      })
      console.log(`[MONGODB] User created successfully (ID: ${user._id}, Role: ${user.role})`)
    } catch (createErr) {
      console.error('[MONGODB] User creation failed:', createErr.message)
      console.error('Error type:', createErr.name)
      console.error('Error message:', createErr.message)

      if (createErr.errors) {
        const errorFields = Object.keys(createErr.errors)
        console.error('Exact failing field:', errorFields.join(', '))
        console.error('Validation error details:', errorFields.map(k => ({
          field: k,
          message: createErr.errors[k].message
        })))
      }

      if (createErr.code === 11000) {
        console.warn('[MONGODB] Duplicate key conflict during User.create. Attempting recovery...')
        const existing = await User.findOne({ $or: query })
        if (existing) {
          console.log('[MONGODB] Found existing user after race condition, proceeding with login')
          user = existing
        } else {
          throw new ApiError(409, 'Account already exists with this phone number or email')
        }
      } else {
        throw new ApiError(500, `Failed to create user account: ${createErr.message}`)
      }
    }
  }

  // Issue Application JWT & Refresh Token
  const { token: authToken, refreshToken: rToken } = await issueAuthTokens(user, req)

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: user.toJSON(),
    token: authToken,
    refreshToken: rToken
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
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const user = await User.findById(decoded.id)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  // Check if this refresh token exists in user's stored tokens
  user.refreshTokens = user.refreshTokens || []
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

/**
 * POST /api/auth/link-phone/send-otp
 * Authenticated endpoint: Request OTP to link or update mobile number
 */
export const sendLinkPhoneOTP = async (req, res) => {
  const { phone } = req.body
  if (!phone) throw new ApiError(400, 'Mobile phone number is required')

  const cleanPhone = normalizeIndianPhone(phone)
  if (!cleanPhone) {
    throw new ApiError(400, 'Please provide a valid 10-digit mobile number')
  }

  // Check if another user already has this phone verified
  const existingUser = await User.findOne({
    phone: cleanPhone,
    _id: { $ne: req.user.id }
  })
  if (existingUser && existingUser.isPhoneVerified) {
    throw new ApiError(409, 'This mobile number is already linked and verified on another account')
  }

  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')

  const { generateSecureOTP, sendOTPMessage } = await import('../services/otpService.js')
  const otp = generateSecureOTP()
  const hashed = hashOTP(otp)

  user.phoneVerificationToken = hashed
  user.phoneVerificationExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  await user.save()

  let smsSent = false
  try {
    await sendOTPMessage(cleanPhone, otp)
    smsSent = true
  } catch (err) {
    console.warn(`[AUTH] SMS dispatch note for +91 ${cleanPhone}: ${err.message}`)
  }

  const isDev = process.env.NODE_ENV !== 'production' || process.env.OTP_MODE === 'development'

  res.status(200).json({
    success: true,
    message: smsSent
      ? `OTP sent successfully to +91 ${cleanPhone}`
      : `OTP generated for +91 ${cleanPhone}`,
    devOtp: isDev ? otp : undefined
  })
}

/**
 * POST /api/auth/link-phone/verify
 * Authenticated endpoint: Verify OTP and link mobile phone number
 */
export const verifyLinkPhone = async (req, res) => {
  const { phone, otp } = req.body
  if (!phone || !otp) {
    throw new ApiError(400, 'Phone number and 6-digit OTP are required')
  }

  const cleanPhone = normalizeIndianPhone(phone)
  if (!cleanPhone) {
    throw new ApiError(400, 'Invalid phone number format')
  }

  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')

  if (!user.phoneVerificationToken || !user.phoneVerificationExpiry) {
    throw new ApiError(400, 'No active OTP verification request found. Please request a new OTP.')
  }

  if (new Date() > new Date(user.phoneVerificationExpiry)) {
    throw new ApiError(400, 'OTP has expired. Please request a new OTP.')
  }

  const cleanOtp = String(otp).trim()
  const hashedInput = hashOTP(cleanOtp)

  if (hashedInput !== user.phoneVerificationToken && cleanOtp !== user.phoneVerificationToken) {
    throw new ApiError(400, 'Invalid OTP code. Please check and try again.')
  }

  // Check once more for concurrent conflicts
  const duplicate = await User.findOne({ phone: cleanPhone, _id: { $ne: user._id } })
  if (duplicate) {
    if (!duplicate.isPhoneVerified) {
      duplicate.phone = undefined
      await duplicate.save()
    } else {
      throw new ApiError(409, 'This mobile number is already linked to another account')
    }
  }

  user.phone = cleanPhone
  user.isPhoneVerified = true
  user.phoneVerificationToken = undefined
  user.phoneVerificationExpiry = undefined
  await user.save()

  res.status(200).json({
    success: true,
    message: 'Mobile number verified and linked successfully',
    user: user.toJSON()
  })
}

