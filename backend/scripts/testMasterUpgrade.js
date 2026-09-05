import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import mongoose from 'mongoose'
import User from '../models/User.js'
import Seller from '../models/Seller.js'
import SellerApplication from '../models/SellerApplication.js'
import Product from '../models/Product.js'
import Campaign from '../models/Campaign.js'

import * as authController from '../controllers/authController.js'
import * as userController from '../controllers/userController.js'
import * as sellerApplicationController from '../controllers/sellerApplicationController.js'
import * as sellerController from '../controllers/sellerController.js'
import * as shopController from '../controllers/shopController.js'
import * as searchController from '../controllers/searchController.js'
import * as campaignController from '../controllers/campaignController.js'
import { adminOnly, sellerOnly, deliveryOnly, customerOnly } from '../middleware/authMiddleware.js'

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

async function runMasterUpgradeTests() {
  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log('💎 SKLP MASTER PROJECT UPGRADE INTEGRATION TEST SUITE')
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sklp_db'
  await mongoose.connect(mongoUri)
  console.log(`📦 Database Connected: ${mongoose.connection.name}\n`)

  const testEmailPrefix = `master_test_${Date.now()}`

  try {
    // ════════════════════════════════════════════════════════════════════
    // 1. AUTHENTICATION & ROLE ESCALATION PROTECTION
    // ════════════════════════════════════════════════════════════════════
    const custPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`
    const updatedPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`

    // Verify OTP endpoints completely removed from auth controller
    assert(typeof authController.sendOTP === 'undefined', 'OTP endpoint sendOTP removed from authController')
    assert(typeof authController.verifyOTP === 'undefined', 'OTP endpoint verifyOTP removed from authController')

    // Register Customer
    const customerReq = {
      body: {
        firstName: 'Test',
        lastName: 'Customer Alpha',
        email: `${testEmailPrefix}_cust@sklp-fashion.com`,
        password: 'Password@123',
        phone: custPhone
      }
    }
    const customerRes = createMockRes()
    await authController.register(customerReq, customerRes)
    assert(customerRes.getStatusCode() === 201, 'Customer registered successfully')
    const customerData = customerRes.getData()
    const customerUser = await User.findById(customerData.user.id || customerData.user._id)
    assert(customerUser.role === 'customer', 'New registered user defaults to role: customer')
    assert(customerUser.authProvider === 'email', 'authProvider is email')

    // Login with Email & Password
    const loginReq = {
      body: {
        email: `${testEmailPrefix}_cust@sklp-fashion.com`,
        password: 'Password@123'
      }
    }
    const loginRes = createMockRes()
    await authController.login(loginReq, loginRes)
    assert(loginRes.getStatusCode() === 200, 'Customer logged in with email & password')
    assert(!!loginRes.getData().token, 'JWT authentication token received')

    // Role Escalation Protection: Customer attempts to update profile to role: admin
    const escalateReq = {
      user: customerUser,
      body: {
        name: 'Test Customer Escalate',
        role: 'admin' // Attempt privilege escalation
      }
    }
    const escalateRes = createMockRes()
    await userController.updateProfile(escalateReq, escalateRes)
    assert(escalateRes.getStatusCode() === 200, 'updateProfile returns 200')
    const reloadedCust = await User.findById(customerUser._id)
    assert(reloadedCust.role === 'customer', 'Role escalation blocked: customer role cannot be escalated to admin')

    // Phone update without OTP (direct profile update with 10-digit validation)
    const phoneUpdateReq = {
      user: customerUser,
      body: {
        phone: updatedPhone
      }
    }
    const phoneUpdateRes = createMockRes()
    await userController.updateProfile(phoneUpdateReq, phoneUpdateRes)
    const updatedPhoneCust = await User.findById(customerUser._id)
    assert(updatedPhoneCust.phone === updatedPhone, 'Phone contact updated directly without OTP requirement')

    // ════════════════════════════════════════════════════════════════════
    // 2. STRICT 4-ROLE RBAC MIDDLEWARE ENFORCEMENT
    // ════════════════════════════════════════════════════════════════════
    console.log('\n─── 2. STRICT 4-ROLE RBAC MIDDLEWARE ENFORCEMENT ───────────────')

    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      name: 'Test Admin',
      email: `${testEmailPrefix}_admin@sklp-fashion.com`,
      password: 'Password@123',
      role: 'admin',
      authProvider: 'email',
      isEmailVerified: true
    })

    const deliveryUser = await User.create({
      firstName: 'Delivery',
      lastName: 'Partner',
      name: 'Test Delivery Partner',
      email: `${testEmailPrefix}_deliv@sklp-fashion.com`,
      password: 'Password@123',
      role: 'delivery',
      authProvider: 'email',
      isEmailVerified: true
    })

    // Test adminOnly with customer vs admin
    let adminBlockedErr = null
    try {
      adminOnly({ user: customerUser }, createMockRes(), (err) => { adminBlockedErr = err })
    } catch (err) {
      adminBlockedErr = err
    }
    assert(adminBlockedErr && adminBlockedErr.statusCode === 403, 'adminOnly blocks customer with 403 Forbidden')

    let adminNextCalled = false
    try {
      adminOnly({ user: adminUser }, createMockRes(), (err) => { if (!err) adminNextCalled = true })
    } catch (err) {}
    assert(adminNextCalled === true, 'adminOnly allows verified admin user')

    // Test deliveryOnly with customer vs delivery partner
    let delivBlockedErr = null
    try {
      deliveryOnly({ user: customerUser }, createMockRes(), (err) => { delivBlockedErr = err })
    } catch (err) {
      delivBlockedErr = err
    }
    assert(delivBlockedErr && delivBlockedErr.statusCode === 403, 'deliveryOnly blocks customer with 403 Forbidden')

    let delivNextCalled = false
    try {
      deliveryOnly({ user: deliveryUser }, createMockRes(), (err) => { if (!err) delivNextCalled = true })
    } catch (err) {}
    assert(delivNextCalled === true, 'deliveryOnly allows delivery partner')

    // Test customerOnly
    let custNextCalled = false
    try {
      customerOnly({ user: customerUser }, createMockRes(), (err) => { if (!err) custNextCalled = true })
    } catch (err) {}
    assert(custNextCalled === true, 'customerOnly allows customer user')

    // ════════════════════════════════════════════════════════════════════
    // 3. SELLER = BRAND SYSTEM & FRAUD DUPLICATE DETECTION
    // ════════════════════════════════════════════════════════════════════
    console.log('\n─── 3. SELLER = BRAND & FRAUD DETECTION ────────────────────────')

    const sellerPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`
    const imposterPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`

    const sellerUser = await User.create({
      firstName: 'Royal',
      lastName: 'Heritage Owner',
      name: 'Royal Heritage Owner',
      email: `${testEmailPrefix}_seller@sklp-fashion.com`,
      phone: sellerPhone,
      password: 'Password@123',
      role: 'customer',
      authProvider: 'email',
      isEmailVerified: true
    })

    // Submit application with brand "Royal Heritage"
    const appReq = {
      user: sellerUser,
      body: {
        applicantName: 'Royal Heritage Owner',
        shopName: 'Royal Heritage Atelier',
        brandName: 'Royal Heritage Atelier',
        description: 'Luxury handcrafted silks and bridal couture',
        businessType: 'partnership',
        taxId: '29ABCDE1234F1Z5',
        phone: sellerPhone,
        email: sellerUser.email,
        address: {
          street: '12 Fashion Blvd',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500034',
          country: 'India'
        }
      }
    }
    const appRes = createMockRes()
    await sellerApplicationController.submitApplication(appReq, appRes)
    assert(appRes.getStatusCode() === 200, 'Seller application submitted successfully')
    const appId = appRes.getData().application.id || appRes.getData().application._id
    const savedApp = await SellerApplication.findById(appId)
    assert(savedApp.brandNameNormalized === 'royalheritageatelier', 'brandNameNormalized stored as lowercase alphanumeric')
    assert(savedApp.status === 'PENDING_REVIEW', 'Application initial status is PENDING_REVIEW')

    // Test Duplicate Risk Flag: Another user tries to apply with the same brand name with different casing
    const dupUser = await User.create({
      firstName: 'Imposter',
      lastName: 'Seller',
      name: 'Imposter Seller',
      email: `${testEmailPrefix}_imposter@sklp-fashion.com`,
      phone: imposterPhone,
      password: 'Password@123',
      role: 'customer',
      authProvider: 'email',
      isEmailVerified: true
    })

    const dupAppReq = {
      user: dupUser,
      body: {
        applicantName: 'Imposter Seller',
        shopName: 'ROYAL HERITAGE ATELIER',
        brandName: 'ROYAL HERITAGE ATELIER',
        description: 'Imposter copycat store',
        businessType: 'individual',
        taxId: '29XXXXX9999Y1Z9',
        phone: imposterPhone,
        email: dupUser.email,
        address: {
          street: '99 Scam Alley',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500034',
          country: 'India'
        }
      }
    }
    const dupAppRes = createMockRes()
    await sellerApplicationController.submitApplication(dupAppReq, dupAppRes)
    assert(dupAppRes.getStatusCode() === 200, 'Duplicate application received and marked for review')
    const dupAppId = dupAppRes.getData().application.id || dupAppRes.getData().application._id
    const savedDupApp = await SellerApplication.findById(dupAppId)
    assert(savedDupApp.reviewFlags.includes('DUPLICATE_RISK'), 'Duplicate brand name automatically flagged with DUPLICATE_RISK')
    assert(savedDupApp.status === 'REVIEW_REQUIRED', 'Duplicate brand status automatically escalated to REVIEW_REQUIRED')

    // ════════════════════════════════════════════════════════════════════
    // 4. ADMIN REVIEW ACTIONS & SELLER MODEL SYNCHRONIZATION
    // ════════════════════════════════════════════════════════════════════
    console.log('\n─── 4. ADMIN REVIEW ACTIONS & SELLER MODEL CREATION ────────────')

    // Rejection without reason must fail
    const rejectNoReasonReq = {
      user: adminUser,
      params: { id: savedDupApp._id },
      body: { action: 'REJECT' }
    }
    const rejectNoReasonRes = createMockRes()
    try {
      await sellerApplicationController.reviewApplication(rejectNoReasonReq, rejectNoReasonRes)
    } catch (err) {
      rejectNoReasonRes.status(err.statusCode || 400).json({ message: err.message })
    }
    assert(rejectNoReasonRes.getStatusCode() === 400, 'Rejection without reason returns 400 Bad Request')

    // Rejection with mandatory reason succeeds
    const rejectWithReasonReq = {
      user: adminUser,
      params: { id: savedDupApp._id },
      body: { action: 'REJECT', reason: 'Duplicate brand name violation' }
    }
    const rejectWithReasonRes = createMockRes()
    await sellerApplicationController.reviewApplication(rejectWithReasonReq, rejectWithReasonRes)
    assert(rejectWithReasonRes.getStatusCode() === 200, 'Rejection with valid reason returns 200 OK')
    const rejectedApp = await SellerApplication.findById(savedDupApp._id)
    assert(rejectedApp.status === 'REJECTED', 'Application status updated to REJECTED')
    assert(rejectedApp.rejectionReason === 'Duplicate brand name violation', 'Rejection reason persisted')

    // Admin APPROVE original seller application
    const approveReq = {
      user: adminUser,
      params: { id: savedApp._id },
      body: { action: 'APPROVE', notes: 'Verified genuine handloom brand' }
    }
    const approveRes = createMockRes()
    await sellerApplicationController.reviewApplication(approveReq, approveRes)
    assert(approveRes.getStatusCode() === 200, 'Application approved by admin returns 200 OK')

    // Verify Seller document created & User role promoted to seller
    const createdSeller = await Seller.findOne({ userId: sellerUser._id })
    assert(!!createdSeller, 'Seller profile automatically created on approval')
    assert(createdSeller.brandName === 'Royal Heritage Atelier', 'Seller brandName properly populated')
    assert(createdSeller.brandNameNormalized === 'royalheritageatelier', 'Seller brandNameNormalized properly populated')
    assert(createdSeller.approvalStatus === 'APPROVED', 'Seller approvalStatus is APPROVED')

    const promotedUser = await User.findById(sellerUser._id)
    assert(promotedUser.role === 'seller', 'User role automatically upgraded to seller')

    // ════════════════════════════════════════════════════════════════════
    // 5. PRODUCT BRAND AUTO-INHERITANCE & OVERRIDE PREVENTION
    // ════════════════════════════════════════════════════════════════════
    console.log('\n─── 5. PRODUCT BRAND AUTO-INHERITANCE & PROTECTION ─────────────')

    // Seller creates product: attempts to override brand with 'FakeCouture' and fake sellerId
    const fakeSellerId = new mongoose.Types.ObjectId()
    const createProdReq = {
      user: promotedUser,
      body: {
        name: 'Zari Border Banarasi Silk Dupatta',
        description: 'Pure handwoven silk dupatta with antique zari border',
        price: 3499,
        originalPrice: 4999,
        category: 'sarees',
        gender: 'women',
        stock: 25,
        brand: 'FakeCoutureOverridden', // MALICIOUS CLIENT OVERRIDE
        sellerId: fakeSellerId, // MALICIOUS SELLER ID OVERRIDE
        images: ['https://example.com/dupatta.jpg']
      }
    }
    const createProdRes = createMockRes()
    await sellerController.createSellerProduct(createProdReq, createProdRes)
    assert(createProdRes.getStatusCode() === 201, 'Product created successfully by approved seller')
    const createdProductData = createProdRes.getData().product

    const fetchedProd = await Product.findById(createdProductData._id)
    assert(fetchedProd.brand === 'Royal Heritage Atelier', 'Client brand override ignored; brand inherited from seller')
    assert(fetchedProd.brandNormalized === 'royalheritageatelier', 'brandNormalized automatically set on Product')
    assert(fetchedProd.sellerId.toString() === createdSeller._id.toString(), 'sellerId automatically linked to authenticated seller')

    // Update Product: seller tries to change brand on update
    const updateProdReq = {
      user: promotedUser,
      params: { id: fetchedProd._id },
      body: {
        name: 'Updated Zari Silk Dupatta',
        brand: 'ChangedBrandHacked' // Attempt to change brand
      }
    }
    const updateProdRes = createMockRes()
    await sellerController.updateSellerProduct(updateProdReq, updateProdRes)
    const reloadedProd = await Product.findById(fetchedProd._id)
    assert(reloadedProd.brand === 'Royal Heritage Atelier', 'Brand remains strictly locked on product update')

    // Non-approved seller product creation rejection check
    const unapprovedSeller = await Seller.create({
      userId: customerUser._id,
      shopName: 'Unapproved Shop',
      shopSlug: 'unapproved-shop',
      brandName: 'Unapproved Shop',
      email: customerUser.email,
      approvalStatus: 'PENDING_REVIEW',
      verificationStatus: 'pending',
      sellerStatus: 'active'
    })
    const unapprovedReq = {
      user: customerUser,
      body: {
        name: 'Unapproved Item',
        price: 999,
        category: 'shirts',
        gender: 'men'
      }
    }
    const unapprovedRes = createMockRes()
    try {
      await sellerController.createSellerProduct(unapprovedReq, unapprovedRes)
    } catch (err) {
      unapprovedRes.status(err.statusCode || 403).json({ message: err.message })
    }
    assert(unapprovedRes.getStatusCode() === 403, 'Unapproved seller product creation returns 403 Forbidden')

    // ════════════════════════════════════════════════════════════════════
    // 6. CUSTOMER SHOP / BRAND SYSTEM & SCOPING
    // ════════════════════════════════════════════════════════════════════
    console.log('\n─── 6. CUSTOMER SHOP / BRAND SYSTEM & SCOPING ──────────────────')

    const shopsReq = { query: {} }
    const shopsRes = createMockRes()
    await shopController.getAllActiveShops(shopsReq, shopsRes)
    assert(shopsRes.getStatusCode() === 200, 'getAllActiveShops returns 200 OK')
    const shopsList = shopsRes.getData().shops
    assert(Array.isArray(shopsList) && shopsList.length >= 1, 'Active shops list contains approved brands')
    const foundShop = shopsList.find(s => s._id.toString() === createdSeller._id.toString())
    assert(!!foundShop, 'Approved Royal Heritage Atelier found in active shops')
    assert(foundShop.productCount >= 1, 'Shop includes live product count')

    // Verify shop-scoped product retrieval via searchController / productController
    const scopedSearchReq = {
      query: {
        sellerId: createdSeller._id.toString(),
        q: 'Silk'
      }
    }
    const scopedSearchRes = createMockRes()
    await searchController.marketplaceSearch(scopedSearchReq, scopedSearchRes)
    assert(scopedSearchRes.getStatusCode() === 200, 'marketplaceSearch with sellerId returns 200 OK')
    const scopedProducts = scopedSearchRes.getData().products
    assert(scopedProducts.every(p => p.sellerId.toString() === createdSeller._id.toString()), 'All returned products belong strictly to the selected shop')

    // ════════════════════════════════════════════════════════════════════
    // 7. ADVANCED MARKETPLACE SEARCH & NATURAL LANGUAGE PRICE
    // ════════════════════════════════════════════════════════════════════
    console.log('\n─── 7. ADVANCED MARKETPLACE SEARCH & NATURAL LANGUAGE ──────────')

    // Search suggestions
    const suggReq = { query: { q: 'Silk' } }
    const suggRes = createMockRes()
    await searchController.getSearchSuggestions(suggReq, suggRes)
    assert(suggRes.getStatusCode() === 200, 'getSearchSuggestions returns 200 OK')
    const suggestions = suggRes.getData().suggestions
    assert(Array.isArray(suggestions) && suggestions.length > 0, 'Suggestions returned for query "Silk"')

    // Natural language price query: "Silk under 4000"
    const naturalReq = { query: { q: 'Silk under 4000' } }
    const naturalRes = createMockRes()
    await searchController.marketplaceSearch(naturalReq, naturalRes)
    assert(naturalRes.getStatusCode() === 200, 'Natural language search returns 200 OK')
    const naturalData = naturalRes.getData()
    assert(naturalData.parsedFilter.maxPrice === 4000, 'Natural language price correctly parsed maxPrice = 4000')
    assert(naturalData.parsedFilter.cleanQuery.toLowerCase() === 'silk', 'Price phrase stripped leaving clean keyword "silk"')
    assert(naturalData.products.length > 0, 'Matching products found under ₹4,000')

    // ════════════════════════════════════════════════════════════════════
    // 8. DYNAMIC MARKETING CAMPAIGNS & EMERGENCY STOP
    // ════════════════════════════════════════════════════════════════════
    console.log('\n─── 8. DYNAMIC MARKETING CAMPAIGNS & EMERGENCY STOP ────────────')

    const activeCampaign = await Campaign.create({
      title: 'Summer Flash Sale',
      type: 'banner',
      status: 'active',
      placement: 'homepage',
      schedule: {
        startDate: new Date(Date.now() - 3600000),
        endDate: new Date(Date.now() + 86400000)
      },
      variants: [{
        variantId: 'A',
        headline: 'Summer Bonanza 50% Off'
      }],
      coupon: {
        couponCode: 'FLASH50',
        discountPercent: 50
      },
      createdBy: adminUser._id
    })
    assert(activeCampaign.status === 'active', 'Marketing campaign created and active')

    // Admin triggers Emergency Stop
    const emergReq = {
      user: adminUser,
      body: { reason: 'System maintenance emergency hold' }
    }
    const emergRes = createMockRes()
    await campaignController.emergencyStopCampaigns(emergReq, emergRes)
    assert(emergRes.getStatusCode() === 200, 'emergencyStopCampaigns returns 200 OK')
    assert(emergRes.getData().pausedCount >= 1, 'Active campaigns paused')

    const stoppedCampaign = await Campaign.findById(activeCampaign._id)
    assert(stoppedCampaign.status === 'paused', 'Campaign status set to paused')

  } catch (error) {
    console.error('\n❌ Unhandled error in test suite:', error)
    failedTests++
  } finally {
    console.log('\n─── CLEANING UP TEST DATA ───────────────────────────────────────')
    try {
      await User.deleteMany({ email: new RegExp(testEmailPrefix) })
      const sellersToDelete = await Seller.find({ brandNameNormalized: /royalheritage|unapproved/ })
      const sellerIds = sellersToDelete.map(s => s._id)
      await Product.deleteMany({ sellerId: { $in: sellerIds } })
      await Seller.deleteMany({ _id: { $in: sellerIds } })
      await SellerApplication.deleteMany({ brandNameNormalized: /royalheritageatelier/ })
      await Campaign.deleteMany({ title: 'Summer Flash Sale' })
      console.log('✅ Temporary test users, sellers, applications, products, and campaigns cleaned up.')
    } catch (cleanupErr) {
      console.error('⚠️ Cleanup error:', cleanupErr.message)
    }
    await mongoose.disconnect()
  }

  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED! (${failedTests} failures)`)
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runMasterUpgradeTests()
