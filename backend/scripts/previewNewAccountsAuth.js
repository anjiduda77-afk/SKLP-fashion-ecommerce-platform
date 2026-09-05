import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Seller from '../models/Seller.js'
import SellerApplication from '../models/SellerApplication.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API_BASE = 'http://localhost:5000/api'
const timestamp = Date.now()

async function runNewAccountsPreview() {
  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log('🔍 SKLP FASHION: PREVIEW AUTHENTICATION FOR BRAND NEW ACCOUNTS')
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  let passed = 0
  let failed = 0
  let applicationId = null
  const errors = []

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${title}: ${details}`)
      failed++
      errors.push(`${title}: ${details}`)
    }
  }

  try {
    // 0. Connection check
    console.log('📡 0. VERIFYING CONNECTION & SYSTEM HEALTH...')
    const healthRes = await axios.get('http://localhost:5000/health')
    assert(healthRes.status === 200 && healthRes.data?.success, 'Backend health check responds 200 OK')
    assert(healthRes.data?.mongodb === 'connected', 'MongoDB Atlas database is connected')

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('  ✅ [DB] Direct MongoDB connection verified\n')

    // ──────────────────────────────────────────────────────────────────────────
    // 1. BRAND NEW CUSTOMER ACCOUNT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🛍️  1. TESTING BRAND NEW CUSTOMER ACCOUNT...')
    const custEmail = `new_cust_${timestamp}@sklp-fashion.com`
    const custPhone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString()
    const custPassword = 'SecureCustomerPass123!'

    // Register
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: custEmail,
      phone: custPhone,
      password: custPassword
    })
    assert(regRes.status === 201 && regRes.data.success, 'New Customer Registration (201 Created)')
    assert(Boolean(regRes.data.token), 'JWT Token returned on Customer registration')
    assert(Boolean(regRes.data.refreshToken), 'Refresh Token returned on Customer registration')
    assert(regRes.data.user.role === 'customer', 'New account assigned default role: "customer"')

    // Login with new credentials
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: custEmail,
      password: custPassword
    })
    assert(loginRes.status === 200 && loginRes.data.success, 'Customer Login with new credentials (200 OK)')
    const custToken = loginRes.data.token
    const custAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${custToken}` }
    })

    // Access Protected Customer Routes
    const profileRes = await custAxios.get('/users/profile')
    assert(profileRes.status === 200 && profileRes.data.success, 'Customer Profile access (/users/profile)')

    const cartRes = await custAxios.get('/cart')
    assert(cartRes.status === 200 && cartRes.data.success, 'Customer Cart access (/cart)')

    const wishlistRes = await custAxios.get('/wishlist')
    assert(wishlistRes.status === 200 && wishlistRes.data.success, 'Customer Wishlist access (/wishlist)')

    // Link & Verify Phone OTP for New Customer
    const sendOtpRes = await custAxios.post('/auth/link-phone/send-otp', {
      phone: custPhone
    })
    assert(sendOtpRes.status === 200 && sendOtpRes.data.success, 'Send OTP for phone linking (/auth/link-phone/send-otp)')
    const otpCode = sendOtpRes.data.devOtp

    if (otpCode) {
      const verifyOtpRes = await custAxios.post('/auth/link-phone/verify', {
        phone: custPhone,
        otp: otpCode
      })
      assert(verifyOtpRes.status === 200 && verifyOtpRes.data.user?.isPhoneVerified === true, 'Verify Phone OTP (/auth/link-phone/verify)')
    }

    // Refresh Token Rotation for Customer
    const refreshRes = await axios.post(`${API_BASE}/auth/refresh-token`, {
      refreshToken: loginRes.data.refreshToken
    })
    assert(refreshRes.status === 200 && refreshRes.data.success, 'Refresh Token rotation for new customer')

    // ──────────────────────────────────────────────────────────────────────────
    // 2. BRAND NEW SELLER ONBOARDING & AUTHENTICATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🏬 2. TESTING BRAND NEW SELLER ACCOUNT ONBOARDING...')
    const sellerEmail = `new_seller_${timestamp}@sklp-fashion.com`
    const sellerPhone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString()
    const sellerPassword = 'SellerSecretPass123!'
    const brandName = `Atelier Luxe ${timestamp.toString().slice(-4)}`

    // Register basic account first
    const sellerReg = await axios.post(`${API_BASE}/auth/register`, {
      firstName: 'Karan',
      lastName: 'Verma',
      email: sellerEmail,
      phone: sellerPhone,
      password: sellerPassword
    })
    assert(sellerReg.status === 201, 'Seller candidate registered as user')
    const sellerUserToken = sellerReg.data.token
    const sellerCandidateAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${sellerUserToken}` }
    })

    // Submit Brand / Seller Application
    const applyRes = await sellerCandidateAxios.post('/seller/apply', {
      applicantName: 'Karan Verma',
      email: sellerEmail,
      phone: sellerPhone,
      shopName: brandName,
      brandName,
      businessType: 'INDIVIDUAL',
      businessCategory: 'Apparel & Couture',
      description: 'Exclusive handcrafted festive couture',
      gstNumber: '36AAAAA0000A1Z5',
      panNumber: 'ABCDE1234F',
      pickupAddress: {
        street: 'Banjara Hills Rd 12',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500034'
      },
      bankDetails: {
        accountHolderName: 'Karan Verma',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank'
      }
    })
    assert((applyRes.status === 200 || applyRes.status === 201) && applyRes.data.success, 'Seller brand application submitted (/seller/apply)')
    applicationId = applyRes.data.application?._id || applyRes.data.application?.id

    // Admin logs in and approves application
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@sklp.com',
      password: 'AdminPassword123!'
    })
    assert(adminLogin.status === 200, 'Admin authenticated to review seller application')
    const adminAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${adminLogin.data.token}` }
    })

    const approveRes = await adminAxios.put(`/admin/seller-applications/${applicationId}/review`, {
      action: 'APPROVE',
      notes: 'Brand credentials, GST and PAN verified.'
    })
    assert(approveRes.status === 200 && approveRes.data.success, 'Admin approved seller application (/admin/seller-applications/:id/review)')

    // Verify user role escalation to seller
    const updatedSellerUser = await User.findOne({ email: sellerEmail })
    assert(updatedSellerUser.role === 'seller', 'User role escalated to "seller"')

    // Seller re-logs in and gets Seller JWT token
    const newSellerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: sellerEmail,
      password: sellerPassword
    })
    assert(newSellerLogin.data.user.role === 'seller', 'New Seller login returns role "seller"')
    const sellerToken = newSellerLogin.data.token
    const sellerAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${sellerToken}` }
    })

    // Access Seller Protected Routes
    const sellerDashRes = await sellerAxios.get('/seller/dashboard')
    assert(sellerDashRes.status === 200 && sellerDashRes.data.success, 'New Seller Dashboard access (/seller/dashboard)')

    const sellerSubRes = await sellerAxios.get('/seller/subscription')
    assert(sellerSubRes.status === 200 && sellerSubRes.data.success, 'New Seller Subscription access (/seller/subscription)')

    // ──────────────────────────────────────────────────────────────────────────
    // 3. BRAND NEW DELIVERY PARTNER ACCOUNT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🚚 3. TESTING BRAND NEW DELIVERY PARTNER ACCOUNT...')
    const deliveryEmail = `new_delivery_${timestamp}@sklp-fashion.com`
    const deliveryPassword = 'DeliveryPass123!'

    // Create delivery user directly
    const deliveryUser = await User.create({
      firstName: 'Ramesh',
      lastName: 'Delivery',
      email: deliveryEmail,
      password: deliveryPassword,
      role: 'delivery',
      status: 'active',
      isActive: true,
      isEmailVerified: true
    })
    assert(deliveryUser.role === 'delivery', 'Delivery account created with role "delivery"')

    // Delivery Login
    const deliveryLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: deliveryEmail,
      password: deliveryPassword
    })
    assert(deliveryLogin.status === 200 && deliveryLogin.data.user.role === 'delivery', 'Delivery Login with credentials (200 OK)')
    const deliveryToken = deliveryLogin.data.token
    const deliveryAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${deliveryToken}` }
    })

    // Access Delivery Protected Routes
    const deliveryDash = await deliveryAxios.get('/delivery/dashboard')
    assert(deliveryDash.status === 200 && deliveryDash.data.success, 'Delivery Dashboard access (/delivery/dashboard)')

    const deliveryOrders = await deliveryAxios.get('/delivery/orders')
    assert(deliveryOrders.status === 200 && deliveryOrders.data.success, 'Delivery Orders queue access (/delivery/orders)')

    // ──────────────────────────────────────────────────────────────────────────
    // 4. BRAND NEW ADMIN ACCOUNT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n👑 4. TESTING BRAND NEW ADMIN ACCOUNT AUTHENTICATION...')
    const newAdminEmail = `new_admin_${timestamp}@sklp-fashion.com`
    const newAdminPassword = 'NewAdminPass123!'

    const newAdminUser = await User.create({
      firstName: 'Master',
      lastName: 'Supervisor',
      email: newAdminEmail,
      password: newAdminPassword,
      role: 'admin',
      status: 'active',
      isActive: true,
      isEmailVerified: true
    })
    assert(newAdminUser.role === 'admin', 'Admin account created with role "admin"')

    // Admin Login
    const newAdminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: newAdminEmail,
      password: newAdminPassword
    })
    assert(newAdminLogin.status === 200 && newAdminLogin.data.user.role === 'admin', 'Admin Login returns 200 OK and role "admin"')
    const newAdminToken = newAdminLogin.data.token
    const newAdminAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${newAdminToken}` }
    })

    // Access Admin Protected Routes
    const adminDash = await newAdminAxios.get('/admin/dashboard')
    assert(adminDash.status === 200 && adminDash.data.success, 'Admin Dashboard access (/admin/dashboard)')

    const adminRev = await newAdminAxios.get('/admin/marketplace-revenue')
    assert(adminRev.status === 200 && adminRev.data.success, 'Admin Marketplace Revenue access (/admin/marketplace-revenue)')

    const adminReviews = await newAdminAxios.get('/admin/reviews')
    assert(adminReviews.status === 200 && adminReviews.data.success, 'Admin Reviews Moderation access (/admin/reviews)')

    // ──────────────────────────────────────────────────────────────────────────
    // 5. NEW GOOGLE / FIREBASE IDENTITY RESOLUTION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🔥 5. TESTING NEW FIREBASE / GOOGLE AUTHENTICATION RESOLUTION...')
    const fbEmail = `new_google_cust_${timestamp}@gmail.com`
    const fbUid = `firebase_uid_${timestamp}`
    const fbToken = `test_firebase_token_:${fbUid}:${fbEmail}`

    const fbLoginRes = await axios.post(`${API_BASE}/auth/google`, {
      idToken: fbToken,
      token: fbToken
    }, {
      headers: { Authorization: `Bearer ${fbToken}` }
    })
    assert(fbLoginRes.status === 200 && fbLoginRes.data.success, 'Firebase/Google Login creates new customer account (200 OK)')
    assert(fbLoginRes.data.user.role === 'customer', 'Firebase/Google new user assigned role "customer"')
    assert(fbLoginRes.data.user.authProvider === 'google', 'Firebase/Google user has authProvider "google"')
    assert(Boolean(fbLoginRes.data.token), 'JWT auth token issued to Firebase/Google user')

    // ──────────────────────────────────────────────────────────────────────────
    // 6. RBAC BOUNDARY ENFORCEMENT ON NEW ACCOUNTS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🛡️  6. TESTING RBAC BOUNDARIES FOR NEW ACCOUNTS...')
    // Customer cannot access admin or seller
    let custBlockedFromAdmin = false
    try {
      await custAxios.get('/admin/dashboard')
    } catch (e) {
      if (e.response?.status === 403) custBlockedFromAdmin = true
    }
    assert(custBlockedFromAdmin, 'Customer strictly blocked from Admin Dashboard (403 Forbidden)')

    let custBlockedFromSeller = false
    try {
      await custAxios.get('/seller/dashboard')
    } catch (e) {
      if (e.response?.status === 403) custBlockedFromSeller = true
    }
    assert(custBlockedFromSeller, 'Customer strictly blocked from Seller Dashboard (403 Forbidden)')

    // Seller cannot access admin
    let sellerBlockedFromAdmin = false
    try {
      await sellerAxios.get('/admin/dashboard')
    } catch (e) {
      if (e.response?.status === 403) sellerBlockedFromAdmin = true
    }
    assert(sellerBlockedFromAdmin, 'Seller strictly blocked from Admin Dashboard (403 Forbidden)')

    // Delivery cannot access admin
    let deliveryBlockedFromAdmin = false
    try {
      await deliveryAxios.get('/admin/dashboard')
    } catch (e) {
      if (e.response?.status === 403) deliveryBlockedFromAdmin = true
    }
    assert(deliveryBlockedFromAdmin, 'Delivery Partner strictly blocked from Admin Dashboard (403 Forbidden)')

    console.log('══════════════════════════════════════════════════════════════════════════')
    if (failed === 0) {
      console.log(`🎉 100% SUCCESS: ALL ${passed} CHECKS PASSED FOR NEW ACCOUNTS AUTHENTICATION!`)
      console.log('══════════════════════════════════════════════════════════════════════════\n')
    } else {
      console.error(`⚠️  COMPLETED WITH ${failed} FAILURES (${passed} passed)`)
      console.error('Errors:', errors)
      console.log('══════════════════════════════════════════════════════════════════════════\n')
      process.exit(1)
    }

  } catch (err) {
    console.error('Fatal Test Suite Error:', err.message)
    if (err.response) {
      console.error('API Error Response Status:', err.response.status)
      console.error('API Error Response Data:', err.response.data)
    }
    process.exit(1)
  } finally {
    try {
      console.log('\n🧹 CLEANING UP TEMPORARY NEW TEST ACCOUNTS...')
      await User.deleteMany({
        $or: [
          { email: { $in: [custEmail, sellerEmail, deliveryEmail, newAdminEmail, fbEmail] } },
          { email: { $regex: /^new_(cust|seller|delivery|admin|google)_/ } },
          { phone: custPhone }
        ]
      })
      await Seller.deleteMany({ email: sellerEmail })
      if (applicationId) {
        await SellerApplication.deleteMany({ _id: applicationId })
      }
      console.log('  ✅ Temporary accounts and applications removed from database.\n')
    } catch (_) {}
    await mongoose.disconnect()
  }
}

runNewAccountsPreview()
