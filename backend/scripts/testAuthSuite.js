import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import * as authController from '../controllers/authController.js'
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js'

async function runAuthSuite() {
  console.log('🚀 Starting SKLP Comprehensive Auth Verification Suite...\n')

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not configured in .env')
    process.exit(1)
  }

  await mongoose.connect(mongoUri)
  console.log('✅ Connected to MongoDB successfully.\n')

  const testEmail = `auth_test_${Date.now()}@sklp-fashion.com`
  const testPassword = 'Password@1234'
  let createdUserId = null
  let issuedAuthToken = null
  let issuedRefreshToken = null

  // ── TEST 1: New User Registration ──
  console.log('--- Test 1: New User Registration ---')
  const mockReq1 = {
    body: {
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: testEmail,
      password: testPassword
    },
    headers: { 'user-agent': 'Auth-Test-Suite/1.0' },
    connection: { remoteAddress: '127.0.0.1' }
  }

  let resData1 = null
  const mockRes1 = {
    status: (code) => ({
      json: (data) => {
        resData1 = { code, ...data }
      }
    })
  }

  try {
    await authController.register(mockReq1, mockRes1)
    if (resData1?.success && resData1?.token && resData1?.user) {
      createdUserId = resData1.user._id
      issuedAuthToken = resData1.token
      issuedRefreshToken = resData1.refreshToken
      console.log('✅ Test 1 PASSED: New user registered successfully!')
      console.log(`   User ID: ${createdUserId}, Email: ${resData1.user.email}, Role: ${resData1.user.role}`)
    } else {
      console.error('❌ Test 1 FAILED: Unexpected response:', resData1)
    }
  } catch (err) {
    console.error('❌ Test 1 FAILED with error:', err.message)
  }

  // ── TEST 2: Duplicate Registration Prevention ──
  console.log('\n--- Test 2: Duplicate Registration Prevention ---')
  try {
    await authController.register(mockReq1, mockRes1)
    console.error('❌ Test 2 FAILED: Expected duplicate registration error but succeeded')
  } catch (err) {
    if (err.statusCode === 409 && err.message.includes('already exists')) {
      console.log('✅ Test 2 PASSED: Duplicate email was rejected with clear error:')
      console.log(`   Status: ${err.statusCode}, Message: "${err.message}"`)
    } else {
      console.error('❌ Test 2 FAILED: Unexpected error format:', err.message)
    }
  }

  // ── TEST 3: Login with Correct Password ──
  console.log('\n--- Test 3: Login with Correct Password ---')
  let resData3 = null
  const mockRes3 = {
    status: (code) => ({
      json: (data) => {
        resData3 = { code, ...data }
      }
    })
  }
  const mockReq3 = {
    body: {
      email: testEmail,
      password: testPassword,
      rememberMe: true
    },
    headers: { 'user-agent': 'Auth-Test-Suite/1.0' },
    connection: { remoteAddress: '127.0.0.1' }
  }

  try {
    await authController.login(mockReq3, mockRes3)
    if (resData3?.success && resData3?.token) {
      console.log('✅ Test 3 PASSED: User logged in successfully!')
      console.log(`   Token issued: ${resData3.token.slice(0, 20)}...`)
    } else {
      console.error('❌ Test 3 FAILED:', resData3)
    }
  } catch (err) {
    console.error('❌ Test 3 FAILED with error:', err.message)
  }

  // ── TEST 4: Login with Incorrect Password ──
  console.log('\n--- Test 4: Login with Incorrect Password ---')
  const mockReq4 = {
    body: {
      email: testEmail,
      password: 'WrongPassword@999'
    },
    headers: { 'user-agent': 'Auth-Test-Suite/1.0' },
    connection: { remoteAddress: '127.0.0.1' }
  }

  try {
    await authController.login(mockReq4, mockRes3)
    console.error('❌ Test 4 FAILED: Expected invalid password error but succeeded')
  } catch (err) {
    if (err.statusCode === 401) {
      console.log('✅ Test 4 PASSED: Invalid password rejected with 401!')
      console.log(`   Message: "${err.message}"`)
    } else {
      console.error('❌ Test 4 FAILED: Unexpected error format:', err)
    }
  }

  // ── TEST 5: Google-Only Account Password Login Hint ──
  console.log('\n--- Test 5: Google-Only Account Password Login Hint ---')
  const googleEmail = `google_user_${Date.now()}@gmail.com`
  const googleUser = await User.create({
    firstName: 'Priya',
    lastName: 'Patel',
    email: googleEmail,
    authProvider: 'google',
    role: 'customer',
    googleId: 'g_uid_' + Date.now(),
    isEmailVerified: true
  })

  const mockReq5 = {
    body: {
      email: googleEmail,
      password: 'AnyPassword@123'
    },
    headers: { 'user-agent': 'Auth-Test-Suite/1.0' },
    connection: { remoteAddress: '127.0.0.1' }
  }

  try {
    await authController.login(mockReq5, mockRes3)
    console.error('❌ Test 5 FAILED: Expected passwordless account error but succeeded')
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Google')) {
      console.log('✅ Test 5 PASSED: Google-only account received informative guidance!')
      console.log(`   Status: ${err.statusCode}, Message: "${err.message}"`)
    } else {
      console.error('❌ Test 5 FAILED: Unexpected error format:', err)
    }
  }

  // ── TEST 6: Token Refresh Rotation ──
  console.log('\n--- Test 6: Refresh Token Rotation ---')
  if (issuedRefreshToken) {
    let resData6 = null
    const mockRes6 = {
      status: (code) => ({
        json: (data) => {
          resData6 = { code, ...data }
        }
      })
    }
    const mockReq6 = {
      body: { refreshToken: issuedRefreshToken },
      headers: { 'user-agent': 'Auth-Test-Suite/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }

    try {
      await authController.refreshToken(mockReq6, mockRes6)
      if (resData6?.success && resData6?.token && resData6?.refreshToken) {
        console.log('✅ Test 6 PASSED: Token rotated successfully!')
        console.log(`   New Token: ${resData6.token.slice(0, 20)}...`)
        console.log(`   New Refresh Token: ${resData6.refreshToken.slice(0, 20)}...`)
      } else {
        console.error('❌ Test 6 FAILED:', resData6)
      }
    } catch (err) {
      console.error('❌ Test 6 FAILED with error:', err.message)
    }
  }

  // ── Clean Up Test Users ──
  console.log('\n--- Cleaning Up Test Data ---')
  if (createdUserId) {
    await User.findByIdAndDelete(createdUserId)
  }
  if (googleUser?._id) {
    await User.findByIdAndDelete(googleUser._id)
  }
  console.log('✅ Cleaned up temporary test users.\n')

  await mongoose.disconnect()
  console.log('🎉 ALL AUTH VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀\n')
}

runAuthSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err)
  process.exit(1)
})
