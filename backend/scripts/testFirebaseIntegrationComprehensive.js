import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import mongoose from 'mongoose'
import User from '../models/User.js'
import * as authController from '../controllers/authController.js'
import { verifyToken, verifyFirebaseToken } from '../middleware/authMiddleware.js'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, name, details = '') {
  totalTests++
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`)
    passedTests++
  } else {
    console.error(`  ❌ [FAIL] ${name}: ${details}`)
    failedTests++
  }
}

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

async function runFirebaseTests() {
  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log('🔥 SKLP FASHION FIREBASE AUTHENTICATION TEST SUITE')
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('📦 Database Connected: ' + (mongoose.connection.name || 'sklp_db') + '\n')

  const testSuffix = Date.now()
  const testEmail = `fb_test_${testSuffix}@gmail.com`
  const testUid = `fb_uid_${testSuffix}`
  let createdUserId = null

  // ─── 1. Missing Token Rejection ───
  console.log('─── 1. MISSING TOKEN REJECTION ──────────────────────────────────')
  {
    const req = { body: {}, headers: {} }
    const res = createMockRes()
    try {
      await authController.firebaseLogin(req, res)
      assert(false, 'Missing token should throw 400 ApiError')
    } catch (err) {
      assert(err.statusCode === 400, 'Missing token correctly rejected with 400 Bad Request', err.message)
    }
  }

  // ─── 2. Invalid Token Rejection ───
  console.log('\n─── 2. INVALID / FORGED TOKEN REJECTION ─────────────────────────')
  {
    const req = { body: { idToken: 'invalid_unverified_token' }, headers: {} }
    const res = createMockRes()
    try {
      await authController.firebaseLogin(req, res)
      assert(false, 'Invalid token should throw 401 ApiError')
    } catch (err) {
      assert(err.statusCode === 401, 'Invalid token correctly rejected with 401 Unauthorized', err.message)
    }
  }

  // ─── 3. New User Registration via Firebase ───
  console.log('\n─── 3. NEW USER CREATION VIA FIREBASE LOGIN ─────────────────────')
  {
    const req = {
      body: {
        idToken: `test_firebase_token_:${testUid}:${testEmail}`
      },
      headers: { 'user-agent': 'FirebaseTest/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.firebaseLogin(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 200 && data.success, 'Firebase Login returns 200 OK with success=true')
    assert(Boolean(data.token), 'Firebase Login issues application JWT token')
    assert(Boolean(data.refreshToken), 'Firebase Login issues refresh token')
    assert(data.user.email === testEmail, 'User email matches token email')
    assert(data.user.firebaseUid === testUid, 'User firebaseUid matches token uid')
    assert(data.user.role === 'customer', 'User role defaults to customer')
    assert(data.user.isEmailVerified === true, 'Email is marked as verified')
    assert(Boolean(data.user.customUserId), 'Unique customUserId auto-generated')

    createdUserId = data.user._id
  }

  // ─── 4. Existing User Login with Same Firebase Identity (No Duplicates) ───
  console.log('\n─── 4. EXISTING USER LOGIN VIA FIREBASE (RE-AUTHENTICATION) ──────')
  {
    const req = {
      body: {
        token: `test_firebase_token_:${testUid}:${testEmail}` // Test token field alias
      },
      headers: { 'user-agent': 'FirebaseTest/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.firebaseLogin(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 200 && data.success, 'Re-login returns 200 OK')
    assert(data.user._id.toString() === createdUserId.toString(), 'Re-login resolves to same user ID without duplicates')

    const count = await User.countDocuments({ email: testEmail })
    assert(count === 1, 'Only 1 user document exists in MongoDB for this email')
  }

  // ─── 5. Firebase Token via Authorization Header ───
  console.log('\n─── 5. FIREBASE TOKEN VIA AUTHORIZATION HEADER ──────────────────')
  {
    const req = {
      body: {},
      headers: {
        authorization: `Bearer test_firebase_token_:${testUid}:${testEmail}`,
        'user-agent': 'FirebaseTest/1.0'
      },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.firebaseLogin(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 200 && data.success, 'Bearer header token extraction works seamlessly')
    assert(data.user.email === testEmail, 'User identified correctly via Bearer header')
  }

  // ─── 6. Account Linking: Existing Email User Links Firebase UID ───
  console.log('\n─── 6. ACCOUNT LINKING: EXISTING EMAIL USER ─────────────────────')
  {
    const linkEmail = `preexisting_${testSuffix}@gmail.com`
    const newUid = `fb_link_uid_${testSuffix}`

    // Create preexisting user without firebaseUid
    const preUser = await User.create({
      firstName: 'Preexisting',
      lastName: 'Customer',
      email: linkEmail,
      authProvider: 'email',
      role: 'customer'
    })

    const req = {
      body: {
        idToken: `test_firebase_token_:${newUid}:${linkEmail}`
      },
      headers: { 'user-agent': 'FirebaseTest/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.firebaseLogin(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 200 && data.success, 'Account linking returns 200 OK')
    assert(data.user._id.toString() === preUser._id.toString(), 'Linked to existing account ID')
    assert(data.user.firebaseUid === newUid, 'firebaseUid linked successfully')
    assert(data.user.isEmailVerified === true, 'Email marked verified after Firebase Google verification')

    await User.findByIdAndDelete(preUser._id)
  }

  // ─── 7. authMiddleware: verifyToken with Firebase ID Token ───
  console.log('\n─── 7. AUTHMIDDLEWARE DUAL-VERIFICATION (verifyToken) ───────────')
  {
    // Token with valid format: 3 segments, ≥ 100 chars
    const dummyJwt = `test_firebase_token_:${testUid}:${testEmail}.${'segment2padding'.repeat(8)}.${'segment3signature'.repeat(4)}`
    const req = {
      header: (name) => name === 'Authorization' ? `Bearer ${dummyJwt}` : null
    }
    const res = {}
    let verified = false

    await new Promise((resolve) => {
      verifyToken(req, res, (err) => {
        if (!err && req.user && req.user.id) {
          verified = true
        }
        resolve()
      })
    })

    assert(verified, 'verifyToken middleware accepts and verifies Firebase ID Token')
    assert(req.user?.email === testEmail, 'verifyToken populates req.user.email')
    assert(req.user?.uid === testUid, 'verifyToken populates req.user.uid')
  }

  // ─── 8. authMiddleware: verifyFirebaseToken ───
  console.log('\n─── 8. AUTHMIDDLEWARE (verifyFirebaseToken) ─────────────────────')
  {
    const req = {
      header: (name) => name === 'Authorization' ? `Bearer test_firebase_token_:${testUid}:${testEmail}` : null
    }
    const res = {}
    let verified = false

    await new Promise((resolve) => {
      verifyFirebaseToken(req, res, (err) => {
        if (!err && req.user && req.user.id) {
          verified = true
        }
        resolve()
      })
    })

    assert(verified, 'verifyFirebaseToken dedicated middleware successfully authenticates')
    assert(req.user?.email === testEmail, 'req.user.email populated')
    assert(req.user?.id === createdUserId.toString(), 'req.user.id populated')
  }

  // ─── Cleanup ───
  console.log('\n─── CLEANING UP TEST DATA ───────────────────────────────────────')
  if (createdUserId) {
    await User.findByIdAndDelete(createdUserId)
    console.log('✅ Temporary test user removed.')
  }

  await mongoose.disconnect()

  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED! (${failedTests} failures)`)
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runFirebaseTests().catch(err => {
  console.error('Fatal Test Error:', err)
  process.exit(1)
})
