import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API_BASE = 'http://localhost:5000/api'

async function runAllAccountsAudit() {
  console.log('\n======================================================================')
  console.log('🛡️  SKLP FASHION MULTI-ACCOUNT COMPREHENSIVE SUITE & AUDIT')
  console.log('======================================================================\n')

  let passedTests = 0
  let failedTests = 0

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`)
      passedTests++
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${details}`)
      failedTests++
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // ACCOUNT 1: ADMIN (`admin@sklp.com`)
  // ──────────────────────────────────────────────────────────────────
  console.log('👑 1. AUDITING ADMIN ACCOUNT (admin@sklp.com)...')
  try {
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@sklp.com',
      password: 'AdminPassword123!'
    })
    assert(adminLogin.status === 200, 'Admin Authentication & JWT Generation')
    assert(adminLogin.data.user.role === 'admin', 'Admin Role Validation')

    const adminAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${adminLogin.data.token}` }
    })

    // Dashboard
    const dashRes = await adminAxios.get('/admin/dashboard')
    assert(dashRes.status === 200 && dashRes.data.success, 'Admin Dashboard Metrics')

    // Orders
    const ordersRes = await adminAxios.get('/admin/orders')
    assert(ordersRes.status === 200, 'Admin Orders List')

    // Products
    const productsRes = await adminAxios.get('/admin/products')
    assert(productsRes.status === 200, 'Admin Products Management')

    // Users
    const usersRes = await adminAxios.get('/admin/users')
    assert(usersRes.status === 200, 'Admin Users Management')

    // Sellers
    const sellersRes = await adminAxios.get('/admin/sellers')
    assert(sellersRes.status === 200, 'Admin Sellers Registry')

    // Seller Applications
    const applicationsRes = await adminAxios.get('/admin/seller-applications')
    assert(applicationsRes.status === 200, 'Admin Seller Applications List')

    // Marketplace Revenue & Settlements Overview
    const revenueRes = await adminAxios.get('/admin/marketplace-revenue')
    assert(revenueRes.status === 200 && revenueRes.data.revenue, 'Admin Marketplace Revenue & Ledger')

    // Coupons
    const couponsRes = await adminAxios.get('/admin/coupons')
    assert(couponsRes.status === 200, 'Admin Coupons Management')

    // Reviews Moderation
    const reviewsRes = await adminAxios.get('/admin/reviews')
    assert(reviewsRes.status === 200, 'Admin Product Reviews Moderation')
  } catch (err) {
    console.error('Admin Account audit failed:', err.response?.data || err.message)
    failedTests++
  }

  // ──────────────────────────────────────────────────────────────────
  // ACCOUNT 2: SELLER (`seller@sklp.com`)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n🏬 2. AUDITING SELLER ACCOUNT (seller@sklp.com)...')
  try {
    const sellerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'seller@sklp.com',
      password: 'SellerPassword123!'
    })
    assert(sellerLogin.status === 200, 'Seller Authentication & JWT Generation')
    assert(sellerLogin.data.user.role === 'seller', 'Seller Role Validation')

    const sellerAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${sellerLogin.data.token}` }
    })

    // Seller Dashboard
    const sellerDash = await sellerAxios.get('/seller/dashboard')
    assert(sellerDash.status === 200 && sellerDash.data.dashboard, 'Seller Dashboard Metrics')

    // Seller Profile
    const sellerProfile = await sellerAxios.get('/seller/profile')
    assert(sellerProfile.status === 200, 'Seller Store Profile')

    // Seller Products
    const sellerProds = await sellerAxios.get('/seller/products')
    assert(sellerProds.status === 200, 'Seller Products List')

    // Seller Offers
    const sellerOffers = await sellerAxios.get('/seller/offers')
    assert(sellerOffers.status === 200, 'Seller Product Offers')

    // Seller Orders
    const sellerOrders = await sellerAxios.get('/seller/orders')
    assert(sellerOrders.status === 200, 'Seller Suborders Fulfillment')

    // Seller Settlements
    const sellerSettlements = await sellerAxios.get('/seller/settlements')
    assert(sellerSettlements.status === 200 && sellerSettlements.data.summary, 'Seller Settlements Ledger')

    // Seller Subscription & Plans
    const sellerSub = await sellerAxios.get('/seller/subscription')
    assert(sellerSub.status === 200 && sellerSub.data.plans?.length > 0, 'Seller Subscription Plans & Trial')
  } catch (err) {
    console.error('Seller Account audit failed:', err.response?.data || err.message)
    failedTests++
  }

  // ──────────────────────────────────────────────────────────────────
  // ACCOUNT 3: DELIVERY PARTNER (`delivery@sklp.com`)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n🚚 3. AUDITING DELIVERY PARTNER ACCOUNT (delivery@sklp.com)...')
  try {
    const deliveryLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'delivery@sklp.com',
      password: 'DeliveryPassword123!'
    })
    assert(deliveryLogin.status === 200, 'Delivery Partner Authentication & JWT Generation')
    assert(deliveryLogin.data.user.role === 'delivery', 'Delivery Role Validation')

    const deliveryAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${deliveryLogin.data.token}` }
    })

    // Delivery Dashboard
    const deliveryDash = await deliveryAxios.get('/delivery/dashboard')
    assert(deliveryDash.status === 200 && deliveryDash.data.data, 'Delivery Dashboard Stats')

    // Assigned Orders
    const deliveryOrders = await deliveryAxios.get('/delivery/orders')
    assert(deliveryOrders.status === 200 && Array.isArray(deliveryOrders.data.orders), 'Delivery Assigned Orders Queue')

    // Delivery Earnings
    const deliveryEarnings = await deliveryAxios.get('/delivery/earnings')
    assert(deliveryEarnings.status === 200 && deliveryEarnings.data.data, 'Delivery Partner Earnings')

    // Delivery Analytics
    const deliveryAnalytics = await deliveryAxios.get('/delivery/analytics')
    assert(deliveryAnalytics.status === 200, 'Delivery Performance Analytics')
  } catch (err) {
    console.error('Delivery Partner Account audit failed:', err.response?.data || err.message)
    failedTests++
  }

  // ──────────────────────────────────────────────────────────────────
  // ACCOUNT 4: CUSTOMER (`customer@sklp.com`)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n🛍️  4. AUDITING CUSTOMER ACCOUNT (customer@sklp.com)...')
  try {
    const custLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'customer@sklp.com',
      password: 'CustomerPassword123!'
    })
    assert(custLogin.status === 200, 'Customer Authentication & JWT Generation')
    assert(custLogin.data.user.role === 'customer', 'Customer Role Validation')

    const custAxios = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${custLogin.data.token}` }
    })

    // User Profile
    const custProfile = await custAxios.get('/users/me')
    assert(custProfile.status === 200, 'Customer Profile Data')

    // User Addresses
    const custAddresses = await custAxios.get('/users/addresses')
    assert(custAddresses.status === 200, 'Customer Addresses')

    // Customer Orders History
    const custOrders = await custAxios.get('/orders')
    assert(custOrders.status === 200, 'Customer Orders History')

    // Customer Cart
    const custCart = await custAxios.get('/cart')
    assert(custCart.status === 200, 'Customer Shopping Cart')

    // Customer Wishlist
    const custWishlist = await custAxios.get('/wishlist')
    assert(custWishlist.status === 200, 'Customer Wishlist')
  } catch (err) {
    console.error('Customer Account audit failed:', err.response?.data || err.message)
    failedTests++
  }

  // ──────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────
  console.log('\n======================================================================')
  if (failedTests === 0) {
    console.log(`🎉 100% SUCCESS: ALL ${passedTests} CHECKS PASSED FOR ALL 4 ACCOUNT TYPES!`)
  } else {
    console.log(`⚠️  AUDIT FINISHED WITH ${failedTests} FAILURE(S) AND ${passedTests} PASSED.`)
  }
  console.log('======================================================================\n')

  process.exit(failedTests === 0 ? 0 : 1)
}

runAllAccountsAudit()
