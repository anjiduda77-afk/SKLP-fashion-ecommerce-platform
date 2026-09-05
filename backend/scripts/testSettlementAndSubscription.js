import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import mongoose from 'mongoose'
import User from '../models/User.js'
import Seller from '../models/Seller.js'
import Order from '../models/Order.js'
import Subscription from '../models/Subscription.js'
import SellerSettlement from '../models/SellerSettlement.js'
import * as subscriptionController from '../controllers/subscriptionController.js'
import * as settlementController from '../controllers/settlementController.js'
import * as deliveryController from '../controllers/deliveryController.js'
import * as orderController from '../controllers/orderController.js'

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

async function runTests() {
  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log('💎 SKLP SELLER SETTLEMENT & SUBSCRIPTION INTEGRATION TEST SUITE')
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sklp_db'
  await mongoose.connect(mongoUri)
  console.log(`📦 Database Connected: ${mongoose.connection.name}\n`)

  const testEmail = `test_seller_settle_${Date.now()}@sklp-fashion.com`
  let testUser = null
  let testSeller = null
  let testOrder = null

  try {
    // Setup test seller user
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'Designer',
      email: testEmail,
      role: 'seller',
      status: 'active',
      isVerified: true
    })

    testSeller = await Seller.create({
      userId: testUser._id,
      shopName: `Test Studio ${Date.now().toString().slice(-4)}`,
      shopSlug: `test-studio-${Date.now().toString().slice(-4)}`,
      commissionRate: 5,
      currentPlan: 'trial',
      subscriptionStatus: 'trial',
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolder: ''
      }
    })

    // ── 1. SUBSCRIPTION INFO & 30-DAY TRIAL INITIALIZATION ───────────────
    console.log('─── 1. SUBSCRIPTION INFO & 30-DAY TRIAL ─────────────────────────')
    {
      const req = { user: { id: testUser._id.toString() } }
      const res = createMockRes()
      await subscriptionController.getSubscriptionInfo(req, res)
      const data = res.getData()

      assert(res.getStatusCode() === 200, 'getSubscriptionInfo returns 200 OK')
      assert(Array.isArray(data?.plans) && data.plans.length === 4, 'Provides 4 seller tiers (Trial, Basic, Pro, Business)')
      assert(data?.currentSubscription?.plan === 'trial', 'Default plan initialized as trial')
      assert(data?.currentSubscription?.status === 'TRIAL', 'Default status is TRIAL')
      assert(data?.daysRemaining >= 29 && data?.daysRemaining <= 30, `Days remaining accurately calculated (~30 days, got ${data?.daysRemaining})`)
      assert(data?.usage?.maxListings === 50, 'Trial includes up to 50 active listings')
    }

    // ── 2. UPGRADE SUBSCRIPTION TO PRO (MONTHLY) ──────────────────────────
    console.log('\n─── 2. UPGRADE SUBSCRIPTION TO PRO (MONTHLY) ────────────────────')
    {
      const req = { 
        user: { id: testUser._id.toString() }, 
        body: { planId: 'pro', billingCycle: 'monthly', paymentMethod: 'razorpay' } 
      }
      const res = createMockRes()
      await subscriptionController.selectSubscriptionPlan(req, res)
      const data = res.getData()

      assert(res.getStatusCode() === 200, 'selectSubscriptionPlan returns 200 OK')
      assert(data?.subscription?.plan === 'pro', 'Subscription plan updated to pro')
      assert(data?.subscription?.amount === 299, 'Monthly price charged is ₹299')
      assert(data?.subscription?.status === 'ACTIVE', 'Subscription status marked ACTIVE')

      const updatedSeller = await Seller.findById(testSeller._id)
      assert(updatedSeller.currentPlan === 'pro', 'Seller model currentPlan updated to pro')
      assert(updatedSeller.commissionRate === 4.5, 'Seller platform commission lowered to 4.5%')
      assert(data?.subscription?.history?.length >= 2, 'Billing history records new invoice transaction')
    }

    // ── 3. UPGRADE SUBSCRIPTION TO BUSINESS (ANNUAL - 16% DISCOUNT) ────────
    console.log('\n─── 3. UPGRADE SUBSCRIPTION TO BUSINESS (ANNUAL) ────────────────')
    {
      const req = { 
        user: { id: testUser._id.toString() }, 
        body: { planId: 'business', billingCycle: 'annual', paymentMethod: 'razorpay' } 
      }
      const res = createMockRes()
      await subscriptionController.selectSubscriptionPlan(req, res)
      const data = res.getData()

      assert(res.getStatusCode() === 200, 'Annual plan upgrade returns 200 OK')
      assert(data?.subscription?.plan === 'business', 'Subscription plan updated to business')
      assert(data?.subscription?.amount === 5999, 'Annual price charged is ₹5,999 (discounted from ₹7,188)')
      assert(data?.subscription?.billingCycle === 'annual', 'Billing cycle set to annual')

      const updatedSeller = await Seller.findById(testSeller._id)
      assert(updatedSeller.commissionRate === 4.0, 'Enterprise commission lowered to 4.0%')
    }

    // ── 4. ORDER PLACEMENT & SETTLEMENT 7-DAY HOLD ─────────────────────────
    console.log('\n─── 4. SETTLEMENT 7-DAY HOLD GENERATION ─────────────────────────')
    const suborderId = `SUB_${Date.now()}_1`
    testOrder = await Order.create({
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      userId: testUser._id,
      items: [{
        productId: new mongoose.Types.ObjectId(),
        name: 'Royal Silk Sherwani',
        price: 2000,
        quantity: 1,
        total: 2000,
        sellerId: testSeller._id,
        shopNameSnapshot: testSeller.shopName
      }],
      sellerSuborders: [{
        sellerId: testSeller._id,
        shopNameSnapshot: testSeller.shopName,
        suborderId: suborderId,
        subtotal: 2000,
        commissionRate: 4,
        platformCommission: 80,
        sellerPayout: 1920,
        status: 'pending'
      }],
      subtotal: 2000,
      totalAmount: 2150,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      status: 'pending'
    })

    const holdFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const settlement = await SellerSettlement.create({
      sellerId: testSeller._id,
      suborderId: suborderId,
      orderId: testOrder._id,
      orderNumber: testOrder.orderNumber,
      eligibleAmount: 2000,
      commissionRate: 4,
      platformCommission: 80,
      sellerPayout: 1920,
      status: 'PENDING',
      holdUntil: holdFuture
    })

    {
      const req = { user: { id: testUser._id.toString() }, query: {} }
      const res = createMockRes()
      await settlementController.getSellerSettlements(req, res)
      const data = res.getData()

      assert(res.getStatusCode() === 200, 'getSellerSettlements returns 200 OK')
      assert(data?.summary?.pendingAmount === 1920, 'Payout correctly held under pendingAmount (₹1,920)')
      assert(data?.summary?.availableAmount === 0, 'Available amount is ₹0 while in 7-day hold')
      assert(data?.settlements?.length >= 1, 'Settlement record appears in ledger')
      assert(data?.settlements[0]?.status === 'PENDING', 'Settlement status is PENDING')
    }

    // ── 5. AUTO-RELEASE 7-DAY HOLD WHEN MATURED ────────────────────────────
    console.log('\n─── 5. AUTO-RELEASE MATURED SETTLEMENTS (PENDING -> AVAILABLE) ──')
    {
      // Simulate 7-day hold expiration by setting holdUntil in the past
      await SellerSettlement.findByIdAndUpdate(settlement._id, {
        holdUntil: new Date(Date.now() - 1000 * 60)
      })

      const req = { user: { id: testUser._id.toString() }, query: {} }
      const res = createMockRes()
      await settlementController.getSellerSettlements(req, res)
      const data = res.getData()

      assert(data?.summary?.availableAmount === 1920, 'Matured settlement auto-released to availableAmount (₹1,920)')
      assert(data?.summary?.pendingAmount === 0, 'Pending amount reduced to ₹0')

      const updatedSettle = await SellerSettlement.findById(settlement._id)
      assert(updatedSettle.status === 'AVAILABLE', 'Database record transitioned to AVAILABLE')
    }

    // ── 6. PAYOUT REQUEST VALIDATION (BANK DETAILS REQUIRED) ───────────────
    console.log('\n─── 6. PAYOUT REQUEST (BANK VALIDATION) ─────────────────────────')
    {
      const req = { user: { id: testUser._id.toString() } }
      const res = createMockRes()

      let threwError = false
      try {
        await settlementController.requestSellerPayout(req, res)
      } catch (err) {
        threwError = true
        assert(err.statusCode === 400 && err.message.includes('bank account'), 'Payout request rejected when bank details missing')
      }
      assert(threwError, 'Bank details properly enforced before payout')
    }

    // ── 7. PAYOUT REQUEST SUCCESS ──────────────────────────────────────────
    console.log('\n─── 7. PAYOUT REQUEST (DISBURSEMENT QUEUED) ─────────────────────')
    {
      // Configure seller bank details
      await Seller.findByIdAndUpdate(testSeller._id, {
        'bankDetails.bankName': 'HDFC Bank Ltd',
        'bankDetails.accountNumber': '50100987654321',
        'bankDetails.ifscCode': 'HDFC0000123',
        'bankDetails.accountHolder': 'Test Designer Studio'
      })

      const req = { user: { id: testUser._id.toString() } }
      const res = createMockRes()
      await settlementController.requestSellerPayout(req, res)
      const data = res.getData()

      assert(res.getStatusCode() === 200, 'requestSellerPayout returns 200 OK')
      assert(data?.payoutAmount === 1920, 'Payout amount matches ₹1,920')
      assert(data?.settlementsCount === 1, '1 settlement record queued for bank transfer')

      const queuedSettle = await SellerSettlement.findById(settlement._id)
      assert(queuedSettle.status === 'PROCESSING', 'Settlement transitioned to PROCESSING')
    }

    // ── 8. ADMIN MARK SETTLEMENT PAID ──────────────────────────────────────
    console.log('\n─── 8. ADMIN DISBURSEMENT / MARK PAID ───────────────────────────')
    {
      const req = { 
        params: { id: settlement._id.toString() }, 
        body: { payoutReference: 'NEFT-HDFC-994411', notes: 'Automated weekly transfer' } 
      }
      const res = createMockRes()
      await settlementController.markSettlementPaid(req, res)
      const data = res.getData()

      assert(res.getStatusCode() === 200, 'markSettlementPaid returns 200 OK')
      assert(data?.settlement?.status === 'PAID', 'Settlement marked as PAID')
      assert(data?.settlement?.payoutReference === 'NEFT-HDFC-994411', 'Payout reference saved in record')
      assert(data?.settlement?.paidAt != null, 'paidAt timestamp recorded')
    }

    // ── 9. ORDER CANCELLATION SETTLEMENT INVALIDATION ──────────────────────
    console.log('\n─── 9. ORDER CANCELLATION SETTLEMENT INVALIDATION ───────────────')
    {
      const cancelOrder = await Order.create({
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        userId: testUser._id,
        items: [{ 
          productId: new mongoose.Types.ObjectId(), 
          name: 'Test Shirt', 
          price: 500, 
          quantity: 1, 
          total: 500,
          shopNameSnapshot: testSeller.shopName 
        }],
        paymentMethod: 'cod',
        subtotal: 500,
        totalAmount: 550,
        status: 'pending'
      })

      const cancelSettle = await SellerSettlement.create({
        sellerId: testSeller._id,
        suborderId: `SUB_CANCEL_${Date.now()}`,
        orderId: cancelOrder._id,
        orderNumber: cancelOrder.orderNumber,
        eligibleAmount: 500,
        commissionRate: 5,
        platformCommission: 25,
        sellerPayout: 475,
        status: 'PENDING',
        holdUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })

      const req = { params: { id: cancelOrder._id.toString() }, user: { id: testUser._id.toString(), role: 'customer' } }
      const res = createMockRes()
      await orderController.cancelOrder(req, res)

      const updatedCancelSettle = await SellerSettlement.findById(cancelSettle._id)
      assert(updatedCancelSettle.status === 'CANCELLED', 'Settlement status updated to CANCELLED on order cancellation')
      assert(updatedCancelSettle.adjustmentReason?.includes('Order cancelled'), 'Adjustment reason recorded')

      await Order.findByIdAndDelete(cancelOrder._id)
      await SellerSettlement.findByIdAndDelete(cancelSettle._id)
    }

    // ── 10. ORDER DELIVERY HOOK (7-DAY HOLD TIMER ACTIVATION) ──────────────
    console.log('\n─── 10. ORDER DELIVERY HOOK & HOLD TIMER INITIALIZATION ─────────')
    {
      const deliverOrder = await Order.create({
        orderNumber: `ORD-DELIV-${Date.now().toString().slice(-6)}`,
        userId: testUser._id,
        assignedTo: testUser._id,
        items: [{ 
          productId: new mongoose.Types.ObjectId(), 
          name: 'Kurta', 
          price: 1000, 
          quantity: 1, 
          total: 1000,
          shopNameSnapshot: testSeller.shopName 
        }],
        sellerSuborders: [{
          sellerId: testSeller._id,
          shopNameSnapshot: testSeller.shopName,
          suborderId: `SUB_DELIV_${Date.now()}`,
          subtotal: 1000,
          status: 'shipped'
        }],
        paymentMethod: 'razorpay',
        subtotal: 1000,
        totalAmount: 1100,
        status: 'out_for_delivery'
      })

      const deliverSettle = await SellerSettlement.create({
        sellerId: testSeller._id,
        suborderId: deliverOrder.sellerSuborders[0].suborderId,
        orderId: deliverOrder._id,
        orderNumber: deliverOrder.orderNumber,
        eligibleAmount: 1000,
        commissionRate: 5,
        platformCommission: 50,
        sellerPayout: 950,
        status: 'PENDING',
        holdUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      })

      const req = {
        params: { orderId: deliverOrder._id.toString() },
        body: { status: 'delivered', notes: 'Delivered to recipient doorstep' },
        user: { id: testUser._id.toString() }
      }
      const res = createMockRes()
      await deliveryController.updateOrderStatus(req, res)

      const updatedDeliverSettle = await SellerSettlement.findById(deliverSettle._id)
      assert(updatedDeliverSettle.deliveredAt != null, 'deliveredAt timestamp set on settlement upon delivery')

      const msDiff = new Date(updatedDeliverSettle.holdUntil).getTime() - Date.now()
      const daysHold = Math.round(msDiff / (1000 * 60 * 60 * 24))
      assert(daysHold === 7, `holdUntil correctly set to 7 days post-delivery (calculated: ${daysHold} days)`)

      const updatedOrder = await Order.findById(deliverOrder._id)
      assert(updatedOrder.sellerSuborders[0].status === 'delivered', 'Seller suborder status updated to delivered')

      await Order.findByIdAndDelete(deliverOrder._id)
      await SellerSettlement.findByIdAndDelete(deliverSettle._id)
    }

  } catch (err) {
    console.error('Unexpected error during test execution:', err)
    failedTests++
  } finally {
    // Clean up test data
    console.log('\n─── CLEANING UP TEST DATA ───────────────────────────────────────')
    if (testSeller) {
      await Subscription.deleteMany({ sellerId: testSeller._id })
      await SellerSettlement.deleteMany({ sellerId: testSeller._id })
      await Seller.findByIdAndDelete(testSeller._id)
    }
    if (testOrder) {
      await Order.findByIdAndDelete(testOrder._id)
    }
    if (testUser) {
      await User.findByIdAndDelete(testUser._id)
    }
    console.log('✅ Temporary test seller, subscription, orders, and settlements removed.')
    await mongoose.disconnect()
  }

  console.log('\n══════════════════════════════════════════════════════════════════════════')
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED! (${failedTests} failures)`)
  console.log('══════════════════════════════════════════════════════════════════════════\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests()
