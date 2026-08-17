import axios from 'axios'
import mongoose from 'mongoose'
import 'dotenv/config'
import User from '../models/User.js'

const API_BASE = 'http://localhost:5000/api'
const TEST_TIMESTAMP = Date.now()
const TEST_EMAIL = `test_customer_${TEST_TIMESTAMP}@sklp-test.com`
const TEST_PHONE = `${Math.floor(6000000000 + Math.random() * 3999999999)}`
const TEST_PASSWORD = 'TestPassword123!'

async function runAuthTests() {
  console.log('\n==================================================')
  console.log('🚀 SKLP FASHION AUTHENTICATION TEST SUITE')
  console.log('==================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${testName}: ${details}`)
      failed++
    }
  }

  try {
    // Connect to DB directly for state inspections/cleanups
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('📦 Connected to MongoDB Atlas for test assertions\n')

    // ──────────────────────────────────────────────────
    // TEST 1: Customer Registration (Strict Role = customer)
    // ──────────────────────────────────────────────────
    console.log('--- TEST 1: Customer Email Registration ---')
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      firstName: 'Anji',
      lastName: 'Customer',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      registerAsSeller: true, // Should be IGNORED by backend!
      role: 'admin' // Should be IGNORED by backend!
    })

    assert(regRes.status === 201, 'Registration returns 201 Created')
    assert(regRes.data.user.role === 'customer', 'Role is strictly "customer" (no seller/admin injection)')
    assert(regRes.data.token, 'Auth JWT token is issued')
    assert(regRes.data.refreshToken, 'Refresh token is issued')
    assert(regRes.data.user.customUserId, `customUserId is auto-generated (${regRes.data.user.customUserId})`)

    const authToken = regRes.data.token
    const refreshToken = regRes.data.refreshToken

    // ──────────────────────────────────────────────────
    // TEST 2: Email & Password Login
    // ──────────────────────────────────────────────────
    console.log('\n--- TEST 2: Email & Password Login ---')
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })

    assert(loginRes.status === 200, 'Login returns 200 OK')
    assert(loginRes.data.user.email === TEST_EMAIL.toLowerCase(), 'User email matches')
    assert(loginRes.data.user.role === 'customer', 'User role is customer')
    assert(loginRes.data.user.password === undefined, 'Password hash is excluded from response (toJSON sanitization)')

    // ──────────────────────────────────────────────────
    // TEST 3: Mobile Number OTP Flow (Send + Verify)
    // ──────────────────────────────────────────────────
    console.log('\n--- TEST 3: Mobile OTP Authentication Flow ---')
    const sendOtpRes = await axios.post(`${API_BASE}/auth/send-otp`, {
      phone: TEST_PHONE
    })

    assert(sendOtpRes.status === 200, 'Send OTP returns 200 OK')
    assert(sendOtpRes.data.success === true, 'Send OTP success is true')

    // Retrieve the generated OTP from DB to simulate user receiving SMS
    const otpUser = await User.findOne({ phone: TEST_PHONE })
    assert(otpUser && otpUser.phoneOtp, 'OTP stored securely for verification')
    const testOtp = otpUser.phoneOtp

    const verifyOtpRes = await axios.post(`${API_BASE}/auth/verify-otp`, {
      phone: TEST_PHONE,
      otp: testOtp
    })

    assert(verifyOtpRes.status === 200, 'Verify OTP returns 200 OK')
    assert(verifyOtpRes.data.user.phone === TEST_PHONE, 'Phone number is verified and linked')
    assert(verifyOtpRes.data.user.role === 'customer', 'OTP created user is strictly "customer"')
    assert(verifyOtpRes.data.user.isPhoneVerified === true, 'isPhoneVerified is true')
    assert(verifyOtpRes.data.token, 'JWT issued upon OTP verification')

    // ──────────────────────────────────────────────────
    // TEST 4: Google Login & Identity Resolution
    // ──────────────────────────────────────────────────
    console.log('\n--- TEST 4: Google Login & Identity Resolution ---')
    const googleRes = await axios.post(`${API_BASE}/auth/google-login`, {
      token: `google_test_${TEST_TIMESTAMP}@sklp-fashion.com`
    })

    assert(googleRes.status === 200, 'Google login returns 200 OK')
    assert(googleRes.data.user.authProvider === 'google', 'Auth provider is Google')
    assert(googleRes.data.user.role === 'customer', 'Google registered user role is customer')
    assert(googleRes.data.user.isEmailVerified === true, 'Google email is marked verified automatically')

    // ──────────────────────────────────────────────────
    // TEST 5: Authenticated Profile & Security Check
    // ──────────────────────────────────────────────────
    console.log('\n--- TEST 5: Authenticated User Profile ---')
    const meRes = await axios.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })

    assert(meRes.status === 200, 'GET /users/me returns 200 OK')
    assert(meRes.data.user.email === TEST_EMAIL.toLowerCase(), 'Profile data matches authenticated user')

    // ──────────────────────────────────────────────────
    // TEST 6: Prevent Unverified Phone Number Edit
    // ──────────────────────────────────────────────────
    console.log('\n--- TEST 6: Phone Modification Security Protection ---')
    let phoneHijackBlocked = false
    try {
      await axios.put(
        `${API_BASE}/users/profile`,
        { phone: '9999999999' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
    } catch (err) {
      if (err.response?.status === 400) {
        phoneHijackBlocked = true
      }
    }
    assert(phoneHijackBlocked, 'Direct unverified phone change is blocked by security validation')

    // ──────────────────────────────────────────────────
    // TEST 7: Refresh Token Rotation
    // ──────────────────────────────────────────────────
    console.log('\n--- TEST 7: Refresh Token Rotation ---')
    const refreshRes = await axios.post(`${API_BASE}/auth/refresh-token`, {
      refreshToken
    })

    assert(refreshRes.status === 200, 'Refresh token returns 200 OK')
    assert(refreshRes.data.token && refreshRes.data.token !== authToken, 'New access token rotated')
    assert(refreshRes.data.refreshToken && refreshRes.data.refreshToken !== refreshToken, 'New refresh token rotated')

    // ──────────────────────────────────────────────────
    // TEST 8: Password Reset Flow (Dedicated Token)
    // ──────────────────────────────────────────────────
    console.log('\n--- TEST 8: Dedicated Password Reset Flow ---')
    const forgotRes = await axios.post(`${API_BASE}/auth/forgot-password`, {
      email: TEST_EMAIL
    })
    assert(forgotRes.status === 200, 'Forgot password returns 200 OK')

    const userWithReset = await User.findOne({ email: TEST_EMAIL.toLowerCase() })
    assert(userWithReset.passwordResetToken, 'passwordResetToken is set in dedicated field')
    assert(userWithReset.passwordResetToken !== userWithReset.emailVerificationToken, 'passwordResetToken is distinct from emailVerificationToken')

    const newPassRes = await axios.post(`${API_BASE}/auth/reset-password`, {
      token: userWithReset.passwordResetToken,
      newPassword: 'BrandNewPassword123!'
    })
    assert(newPassRes.status === 200, 'Password reset with dedicated token succeeds')

    // Clean up test records
    await User.deleteMany({
      $or: [
        { email: TEST_EMAIL.toLowerCase() },
        { phone: TEST_PHONE },
        { email: `google_test_${TEST_TIMESTAMP}@sklp-fashion.com` }
      ]
    })
    console.log('\n🧹 Cleaned up test database records')

    console.log('\n==================================================')
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('==================================================\n')

    await mongoose.disconnect()
    process.exit(failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n❌ Unexpected error during test execution:', error?.response?.data || error.message)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  }
}

runAuthTests()
