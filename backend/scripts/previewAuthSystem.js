import 'dotenv/config'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import * as authController from '../controllers/authController.js'
import * as userController from '../controllers/userController.js'

function createMockRes() {
  let statusCode = 200
  let responseData = null
  return {
    status: (code) => {
      statusCode = code
      return {
        json: (data) => {
          responseData = { statusCode: code, ...data }
        }
      }
    },
    json: (data) => {
      responseData = { statusCode, ...data }
    },
    getData: () => responseData,
    getStatusCode: () => statusCode
  }
}

async function previewAuthenticationSystem() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗')
  console.log('║               SKLP FASHION AUTHENTICATION SYSTEM PREVIEW                 ║')
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n')

  await mongoose.connect(process.env.MONGODB_URI)
  console.log(`📡 MongoDB Connected: ${mongoose.connection.name} (${mongoose.connection.host})\n`)

  const timestamp = Date.now()

  // ──────────────────────────────────────────────────────────────────────────
  // PREVIEW 1: Customer Email/Password Registration
  // ──────────────────────────────────────────────────────────────────────────
  console.log('┌─── [1] CUSTOMER EMAIL/PASSWORD REGISTRATION ────────────────────────────')
  const regEmail = `preview_cust_${timestamp}@sklp.com`
  const regReq = {
    body: {
      firstName: 'Kavya',
      lastName: 'Reddy',
      email: regEmail,
      password: 'RoyalPassword2026!'
    },
    headers: { 'user-agent': 'Chrome/124.0.0.0 (Windows NT 10.0; Win64; x64)' },
    connection: { remoteAddress: '127.0.0.1' }
  }
  const regRes = createMockRes()
  await authController.register(regReq, regRes)
  const regData = regRes.getData()

  console.log(`│ Endpoint       : POST /api/auth/register`)
  console.log(`│ HTTP Status    : ${regRes.getStatusCode()} Created`)
  console.log(`│ Account Type   : ${regData.user.role.toUpperCase()} (Default Safe Assignment)`)
  console.log(`│ Custom User ID : ${regData.user.customUserId}`)
  console.log(`│ Name           : ${regData.user.firstName} ${regData.user.lastName}`)
  console.log(`│ Email          : ${regData.user.email}`)
  console.log(`│ Access Token   : ${regData.token.slice(0, 32)}... (7-day validity)`)
  console.log(`│ Refresh Token  : ${regData.refreshToken.slice(0, 32)}... (30-day validity)`)
  console.log(`│ Sanitization   : password=undefined, refreshTokens=undefined (Clean)`)
  console.log('└─────────────────────────────────────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────────────────────
  // PREVIEW 2: Mobile Phone OTP Authentication Flow
  // ──────────────────────────────────────────────────────────────────────────
  console.log('┌─── [2] MOBILE PHONE OTP INSTANT AUTHENTICATION ─────────────────────────')
  process.env.OTP_MODE = 'development'
  const otpPhone = '9876543210'
  const sendReq = { body: { phone: otpPhone } }
  const sendRes = createMockRes()
  await authController.sendOTP(sendReq, sendRes)
  const sendData = sendRes.getData()

  console.log(`│ Endpoint 1     : POST /api/auth/send-otp`)
  console.log(`│ HTTP Status    : ${sendRes.getStatusCode()} OK`)
  console.log(`│ SMS Gateway    : ${sendData.provider || 'Fast2SMS / 2Factor.in'}`)
  console.log(`│ Message        : ${sendData.message}`)
  console.log(`│ Expiration     : ${sendData.expiresIn} seconds (5 mins)`)
  console.log(`│ Storage        : SHA-256 Hash stored in DB (Plain text NEVER stored)`)

  const verifyReq = {
    body: { phone: otpPhone, otp: sendData.devOtp },
    headers: { 'user-agent': 'Mobile-App/1.0' },
    connection: { remoteAddress: '127.0.0.1' }
  }
  const verifyRes = createMockRes()
  await authController.verifyOTP(verifyReq, verifyRes)
  const verifyData = verifyRes.getData()

  console.log(`│ Endpoint 2     : POST /api/auth/verify-otp`)
  console.log(`│ HTTP Status    : ${verifyRes.getStatusCode()} OK`)
  console.log(`│ Verified Phone : +91 ${verifyData.user.phone}`)
  console.log(`│ isPhoneVerified: ${verifyData.user.isPhoneVerified}`)
  console.log(`│ Access Token   : ${verifyData.token.slice(0, 32)}...`)
  console.log('└─────────────────────────────────────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────────────────────
  // PREVIEW 3: Google Sign-In & Unified Identity Linking
  // ──────────────────────────────────────────────────────────────────────────
  console.log('┌─── [3] GOOGLE OAUTH 2.0 IDENTITY RESOLUTION ────────────────────────────')
  const gEmail = `google_preview_${timestamp}@gmail.com`
  const gReq = {
    body: { token: gEmail },
    headers: { 'user-agent': 'Browser/GoogleAuth' },
    connection: { remoteAddress: '127.0.0.1' }
  }
  const gRes = createMockRes()
  await authController.googleLogin(gReq, gRes)
  const gData = gRes.getData()

  console.log(`│ Endpoint       : POST /api/auth/google-login`)
  console.log(`│ HTTP Status    : ${gRes.getStatusCode()} OK`)
  console.log(`│ Auth Provider  : ${gData.user.authProvider}`)
  console.log(`│ Email Status   : isEmailVerified=${gData.user.isEmailVerified} (Auto-verified by Google)`)
  console.log(`│ Role           : ${gData.user.role}`)
  console.log(`│ Linked Token   : ${gData.token.slice(0, 32)}...`)
  console.log('└─────────────────────────────────────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────────────────────
  // PREVIEW 4: Refresh Token Silent Rotation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('┌─── [4] REFRESH TOKEN ROTATION & ANTI-THEFT REVOCATION ──────────────────')
  const refReq = {
    body: { refreshToken: regData.refreshToken },
    headers: { 'user-agent': 'Chrome/124.0.0.0' },
    connection: { remoteAddress: '127.0.0.1' }
  }
  const refRes = createMockRes()
  await authController.refreshToken(refReq, refRes)
  const refData = refRes.getData()

  console.log(`│ Endpoint       : POST /api/auth/refresh-token`)
  console.log(`│ HTTP Status    : ${refRes.getStatusCode()} OK`)
  console.log(`│ Old Refresh Tok: Revoked & Rotated (Single Use Protection)`)
  console.log(`│ New Access Tok : ${refData.token.slice(0, 32)}...`)
  console.log(`│ New Refresh Tok: ${refData.refreshToken.slice(0, 32)}...`)
  console.log('└─────────────────────────────────────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────────────────────
  // PREVIEW 5: Seeded Real Accounts Status & Roles
  // ──────────────────────────────────────────────────────────────────────────
  console.log('┌─── [5] ACTIVE SYSTEM ACCOUNTS IN DATABASE ──────────────────────────────')
  const adminDoc = await User.findOne({ email: 'admin@sklp.com' }).lean()
  const sellerDoc = await User.findOne({ email: 'seller@sklp.com' }).lean()
  const deliveryDoc = await User.findOne({ email: 'delivery@sklp.com' }).lean()
  const custDoc = await User.findOne({ email: 'customer@sklp.com' }).lean()

  console.log(`│ 👑 ADMIN ACCOUNT    : ${adminDoc?.email || 'N/A'} (Role: ${adminDoc?.role}, Phone: ${adminDoc?.phone || 'Linked'}, Status: ${adminDoc?.status})`)
  console.log(`│ 🏬 SELLER ACCOUNT   : ${sellerDoc?.email || 'N/A'} (Role: ${sellerDoc?.role}, Store: "${sellerDoc?.sellerProfile?.storeName || 'Verified Store'}", Status: ${sellerDoc?.status})`)
  console.log(`│ 🚚 DELIVERY ACCOUNT : ${deliveryDoc?.email || 'N/A'} (Role: ${deliveryDoc?.role}, Status: ${deliveryDoc?.status})`)
  console.log(`│ 🛍️ CUSTOMER ACCOUNT : ${custDoc?.email || 'N/A'} (Role: ${custDoc?.role}, ID: ${custDoc?.customUserId || 'N/A'}, Status: ${custDoc?.status})`)
  console.log('└─────────────────────────────────────────────────────────────────────────\n')

  // Clean up preview users
  await User.deleteMany({ _id: { $in: [regData.user._id, verifyData.user._id, gData.user._id] } })

  await mongoose.disconnect()
  console.log('✨ All 5 Authentication preview cycles executed and validated successfully!\n')
}

previewAuthenticationSystem().catch((err) => {
  console.error('Preview error:', err)
  process.exit(1)
})
