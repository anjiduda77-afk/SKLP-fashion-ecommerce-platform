import 'dotenv/config'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import Wishlist from '../models/Wishlist.js'
import * as authController from '../controllers/authController.js'
import * as userController from '../controllers/userController.js'
import * as cartController from '../controllers/cartController.js'
import * as orderController from '../controllers/orderController.js'
import * as deliveryController from '../controllers/deliveryController.js'
import * as sellerController from '../controllers/sellerController.js'
import * as adminController from '../controllers/adminController.js'
import { verifyToken, adminOnly, sellerOrAdmin } from '../middleware/authMiddleware.js'
import verifyRole from '../middleware/verifyRole.js'

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

// Mock Express response helper
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

async function runComprehensiveAuthTests() {
  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log('🧪 SKLP FASHION COMPREHENSIVE MULTI-TYPE AUTHENTICATION TEST SUITE')
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('📦 Database Connected: ' + (mongoose.connection.name || 'sklp_db') + '\n')

  const testSuffix = Date.now()
  const customerEmail = `customer_${testSuffix}@test.sklp.com`
  const sellerEmail = `seller_${testSuffix}@test.sklp.com`
  const deliveryEmail = `delivery_${testSuffix}@test.sklp.com`
  const adminEmail = `admin_${testSuffix}@test.sklp.com`
  const testPassword = 'StrongPassword123!'

  let customerUser, sellerUser, deliveryUser, adminUser
  let customerToken, sellerToken, deliveryToken, adminToken
  let customerRefreshToken, sellerRefreshToken

  // ──────────────────────────────────────────────────────────────────────────
  // 1. EMAIL & PASSWORD REGISTRATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('─── 1. EMAIL & PASSWORD REGISTRATION ───────────────────────────')
  {
    const req = {
      body: {
        firstName: 'Ananya',
        lastName: 'Roy',
        email: customerEmail,
        password: testPassword
      },
      headers: { 'user-agent': 'TestRunner/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.register(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 201 && data.success, 'Registration returns 201 Created with success=true')
    assert(Boolean(data.token), 'Registration returns valid JWT auth token')
    assert(Boolean(data.refreshToken), 'Registration returns valid refresh token')
    assert(data.user.role === 'customer', 'New registered user defaults to customer role')
    assert(!data.user.password, 'Password hash is NEVER exposed in user payload')
    assert(!data.user.refreshTokens, 'Refresh tokens array is NEVER exposed in user payload')

    customerUser = data.user
    customerToken = data.token
    customerRefreshToken = data.refreshToken
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. EMAIL & PASSWORD LOGIN
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 2. EMAIL & PASSWORD LOGIN ───────────────────────────────────')
  {
    const req = {
      body: {
        email: customerEmail,
        password: testPassword
      },
      headers: { 'user-agent': 'TestRunner/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.login(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 200 && data.success, 'Login returns 200 OK with success=true')
    assert(Boolean(data.token), 'Login returns JWT token')
    assert(data.user.email === customerEmail, 'Returned user email matches')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. INVALID CREDENTIALS REJECTION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 3. INVALID CREDENTIALS REJECTION ───────────────────────────')
  {
    const req = {
      body: {
        email: customerEmail,
        password: 'IncorrectPassword999!'
      },
      headers: { 'user-agent': 'TestRunner/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    try {
      await authController.login(req, res)
      assert(false, 'Invalid password should throw ApiError')
    } catch (err) {
      assert(err.statusCode === 401, 'Invalid password correctly returns 401 Unauthorized', err.message)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. GOOGLE AUTHENTICATION (UNIFIED RESOLUTION)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 4. GOOGLE AUTHENTICATION & IDENTITY RESOLUTION ──────────────')
  {
    const googleEmail = `google_auth_${testSuffix}@gmail.com`
    const req = {
      body: {
        token: googleEmail // Dev fallback mode
      },
      headers: { 'user-agent': 'TestRunner/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.googleLogin(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 200 && data.success, 'Google Login returns 200 OK')
    assert(data.user.authProvider === 'google', 'User authProvider is set to google')
    assert(data.user.isEmailVerified === true, 'Google email is marked as verified')
    assert(data.user.role === 'customer', 'Google login creates customer role by default')
    
    // Clean up google user
    await User.findByIdAndDelete(data.user._id)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. MOBILE PHONE OTP GENERATION & VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 5. MOBILE PHONE OTP FLOW (SEND & VERIFY) ────────────────────')
  {
    process.env.OTP_MODE = 'development'
    const testPhone = '9812345678'
    const sendReq = { body: { phone: testPhone } }
    const sendRes = createMockRes()
    await authController.sendOTP(sendReq, sendRes)
    const sendData = sendRes.getData()

    assert(sendRes.getStatusCode() === 200 && sendData.success, 'Send OTP returns 200 OK')
    assert(Boolean(sendData.devOtp), 'Dev OTP received for verification in test environment')

    // Verify OTP
    const verifyReq = {
      body: {
        phone: testPhone,
        otp: sendData.devOtp
      },
      headers: { 'user-agent': 'TestRunner/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const verifyRes = createMockRes()
    await authController.verifyOTP(verifyReq, verifyRes)
    const verifyData = verifyRes.getData()

    assert(verifyRes.getStatusCode() === 200 && verifyData.success, 'Verify OTP returns 200 OK')
    assert(verifyData.user.isPhoneVerified === true, 'Phone is marked as verified')
    assert(Boolean(verifyData.token), 'JWT token returned on OTP login')

    // Clean up OTP user
    await User.findByIdAndDelete(verifyData.user._id)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. REFRESH TOKEN ROTATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 6. REFRESH TOKEN ROTATION & SESSION MANAGEMENT ─────────────')
  {
    const req = {
      body: { refreshToken: customerRefreshToken },
      headers: { 'user-agent': 'TestRunner/1.0' },
      connection: { remoteAddress: '127.0.0.1' }
    }
    const res = createMockRes()
    await authController.refreshToken(req, res)
    const data = res.getData()

    assert(res.getStatusCode() === 200 && data.success, 'Refresh token endpoint returns 200 OK')
    assert(Boolean(data.token) && data.token !== customerToken, 'New distinct JWT access token issued')
    assert(Boolean(data.refreshToken) && data.refreshToken !== customerRefreshToken, 'New distinct refresh token issued')
    customerToken = data.token
    customerRefreshToken = data.refreshToken
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. MULTI-ACCOUNT CREATION (SELLER, DELIVERY, ADMIN)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 7. MULTI-ROLE ACCOUNTS PROVISIONING ─────────────────────────')
  {
    sellerUser = await User.create({
      firstName: 'Vikram',
      lastName: 'Mehta',
      email: sellerEmail,
      password: testPassword,
      role: 'seller',
      status: 'active',
      isActive: true,
      isEmailVerified: true
    })
    sellerToken = jwt.sign(
      { id: sellerUser._id.toString(), email: sellerUser.email, role: sellerUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    deliveryUser = await User.create({
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: deliveryEmail,
      password: testPassword,
      role: 'delivery',
      status: 'active',
      isActive: true,
      isEmailVerified: true
    })
    deliveryToken = jwt.sign(
      { id: deliveryUser._id.toString(), email: deliveryUser.email, role: deliveryUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    adminUser = await User.create({
      firstName: 'Siddharth',
      lastName: 'Kapoor',
      email: adminEmail,
      password: testPassword,
      role: 'admin',
      status: 'active',
      isActive: true,
      isEmailVerified: true
    })
    adminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    assert(Boolean(sellerUser && sellerToken), 'Seller Account Provisioned & Tokenized')
    assert(Boolean(deliveryUser && deliveryToken), 'Delivery Partner Provisioned & Tokenized')
    assert(Boolean(adminUser && adminToken), 'Admin Account Provisioned & Tokenized')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION BOUNDARIES
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 8. RBAC PERMISSION BOUNDARIES ENFORCEMENT ──────────────────')
  {
    // A. Customer trying to access Admin Route
    const adminCheck = verifyRole(['admin'])
    let customerBlocked = false
    const mockReqCust = { user: { id: customerUser._id, role: 'customer' } }
    const mockResCust = {}
    adminCheck(mockReqCust, mockResCust, (err) => {
      if (err && err.statusCode === 403) customerBlocked = true
    })
    assert(customerBlocked, 'RBAC: Customer blocked from Admin routes with 403 Forbidden')

    // B. Customer trying to access Seller Route
    const sellerCheck = verifyRole(['seller', 'admin'])
    let customerBlockedFromSeller = false
    sellerCheck(mockReqCust, mockResCust, (err) => {
      if (err && err.statusCode === 403) customerBlockedFromSeller = true
    })
    assert(customerBlockedFromSeller, 'RBAC: Customer blocked from Seller routes with 403 Forbidden')

    // C. Customer trying to access Delivery Route
    const deliveryCheck = verifyRole(['delivery', 'deliveryPartner'])
    let customerBlockedFromDelivery = false
    deliveryCheck(mockReqCust, mockResCust, (err) => {
      if (err && err.statusCode === 403) customerBlockedFromDelivery = true
    })
    assert(customerBlockedFromDelivery, 'RBAC: Customer blocked from Delivery routes with 403 Forbidden')

    // D. Seller trying to access Admin Route
    let sellerBlockedFromAdmin = false
    const mockReqSeller = { user: { id: sellerUser._id, role: 'seller' } }
    adminCheck(mockReqSeller, mockResCust, (err) => {
      if (err && err.statusCode === 403) sellerBlockedFromAdmin = true
    })
    assert(sellerBlockedFromAdmin, 'RBAC: Seller blocked from Admin routes with 403 Forbidden')

    // E. Admin accessing Admin Route
    let adminAllowed = false
    const mockReqAdmin = { user: { id: adminUser._id, role: 'admin' } }
    adminCheck(mockReqAdmin, mockResCust, (err) => {
      if (!err) adminAllowed = true
    })
    assert(adminAllowed, 'RBAC: Admin granted access to Admin routes')

    // F. Seller accessing Seller Route
    let sellerAllowed = false
    sellerCheck(mockReqSeller, mockResCust, (err) => {
      if (!err) sellerAllowed = true
    })
    assert(sellerAllowed, 'RBAC: Seller granted access to Seller routes')

    // G. Delivery Partner accessing Delivery Route
    let deliveryAllowed = false
    const mockReqDelivery = { user: { id: deliveryUser._id, role: 'delivery' } }
    deliveryCheck(mockReqDelivery, mockResCust, (err) => {
      if (!err) deliveryAllowed = true
    })
    assert(deliveryAllowed, 'RBAC: Delivery Partner granted access to Delivery routes')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. CONTROLLER RESPONSES WITH AUTHENTICATED USER CONTEXT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 9. CONTROLLER RESPONSES WITH AUTH CONTEXT ───────────────────')
  {
    // User Profile
    const profileReq = { user: { id: customerUser._id, role: 'customer' } }
    const profileRes = createMockRes()
    await userController.getProfile(profileReq, profileRes)
    const profileData = profileRes.getData()
    assert(profileRes.getStatusCode() === 200 && profileData.user.email === customerEmail, 'getProfile returns authenticated user payload')

    // Cart Operations
    const cartReq = { user: { id: customerUser._id, role: 'customer' } }
    const cartRes = createMockRes()
    await cartController.getCart(cartReq, cartRes)
    const cartData = cartRes.getData()
    assert(cartRes.getStatusCode() === 200 && Boolean(cartData.cart), 'getCart returns user cart payload')

    // Wishlist Operations
    const wishReq = { user: { id: customerUser._id, role: 'customer' } }
    const wishRes = createMockRes()
    await userController.getWishlist(wishReq, wishRes)
    const wishData = wishRes.getData()
    assert(wishRes.getStatusCode() === 200 && Boolean(wishData.wishlist), 'getWishlist returns user wishlist payload')

    // Delivery Dashboard
    const delivReq = { user: { id: deliveryUser._id.toString(), role: 'delivery' } }
    const delivRes = createMockRes()
    await deliveryController.getDashboard(delivReq, delivRes)
    const delivData = delivRes.getData()
    assert(delivRes.getStatusCode() === 200 && Boolean(delivData.data), 'getDashboard for delivery returns stats payload')

    // Admin Dashboard Metrics
    const admReq = { user: { id: adminUser._id.toString(), role: 'admin' } }
    const admRes = createMockRes()
    await adminController.getDashboardMetrics(admReq, admRes)
    const admData = admRes.getData()
    assert(admRes.getStatusCode() === 200 && admData.success, 'getDashboardMetrics returns admin metrics')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. TOKEN EXPIRATION & INVALID TOKEN HANDLING
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── 10. TOKEN INTEGRITY & ERROR HANDLING ────────────────────────')
  {
    // Expired Token — verifyToken is async (asyncHandler), must await callback resolution
    const expiredToken = jwt.sign(
      { id: customerUser._id, role: 'customer' },
      process.env.JWT_SECRET || 'sklp_fashion_key_anji7206',
      { expiresIn: '-1s' }
    )
    const expiredReq = {
      header: (name) => name === 'Authorization' ? `Bearer ${expiredToken}` : null
    }
    const expiredRes = {}
    let expiredCaught = false
    await new Promise((resolve) => {
      try {
        const result = verifyToken(expiredReq, expiredRes, (err) => {
          if (err && (err.message?.toLowerCase().includes('expired') || err.statusCode === 401)) expiredCaught = true
          resolve()
        })
        // If verifyToken returns a Promise (asyncHandler), catch rejections too
        if (result && typeof result.catch === 'function') {
          result.catch((err) => {
            if (err && (err.message?.toLowerCase().includes('expired') || err.statusCode === 401)) expiredCaught = true
            resolve()
          })
        } else {
          // Synchronous path fallback
          resolve()
        }
      } catch (err) {
        if (err.statusCode === 401 && err.message?.toLowerCase().includes('expired')) expiredCaught = true
        resolve()
      }
    })
    assert(expiredCaught, 'Expired JWT token triggers 401 Token expired')

    // Tampered Token
    const tamperedReq = {
      header: (name) => name === 'Authorization' ? 'Bearer invalid.token.payload' : null
    }
    let tamperedCaught = false
    await new Promise((resolve) => {
      try {
        const result = verifyToken(tamperedReq, expiredRes, (err) => {
          if (err && err.statusCode === 401) tamperedCaught = true
          resolve()
        })
        if (result && typeof result.catch === 'function') {
          result.catch((err) => {
            if (err && err.statusCode === 401) tamperedCaught = true
            resolve()
          })
        } else {
          resolve()
        }
      } catch (err) {
        if (err.statusCode === 401) tamperedCaught = true
        resolve()
      }
    })
    assert(tamperedCaught, 'Tampered/Malformed JWT triggers 401 Invalid token')

    // Missing Token
    const missingReq = {
      header: () => null
    }
    let missingCaught = false
    await new Promise((resolve) => {
      try {
        const result = verifyToken(missingReq, expiredRes, (err) => {
          if (err && err.statusCode === 401) missingCaught = true
          resolve()
        })
        if (result && typeof result.catch === 'function') {
          result.catch((err) => {
            if (err && err.statusCode === 401) missingCaught = true
            resolve()
          })
        } else {
          resolve()
        }
      } catch (err) {
        if (err.statusCode === 401) missingCaught = true
        resolve()
      }
    })
    assert(missingCaught, 'Missing token triggers 401 No authentication token provided')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n─── CLEANING UP TEST DATA ───────────────────────────────────────')
  await User.deleteMany({ _id: { $in: [customerUser._id, sellerUser._id, deliveryUser._id, adminUser._id] } })
  await Cart.deleteMany({ userId: { $in: [customerUser._id, sellerUser._id, deliveryUser._id, adminUser._id] } })
  await Wishlist.deleteMany({ userId: { $in: [customerUser._id, sellerUser._id, deliveryUser._id, adminUser._id] } })
  console.log('✅ Temporary test users, carts, and wishlists removed.')

  await mongoose.disconnect()

  console.log('\n══════════════════════════════════════════════════════════════════════════')
  if (failedTests === 0) {
    console.log(`🎉 100% SUCCESS: ALL ${passedTests}/${totalTests} TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${failedTests} FAILED out of ${totalTests} total tests.`)
  }
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  process.exit(failedTests === 0 ? 0 : 1)
}

runComprehensiveAuthTests().catch((err) => {
  console.error('Fatal Test Suite Error:', err)
  process.exit(1)
})
