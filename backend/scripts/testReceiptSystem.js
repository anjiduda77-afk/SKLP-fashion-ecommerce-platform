import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import { maskPhoneNumber } from '../utils/phoneUtils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sklp_fashion_key_anji7206';

async function runTests() {
  console.log('============================================================');
  console.log('STYLE STREET RECEIPT & SHIPPING LABEL — AUTOMATED TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  };

  // ── TEST SUITE 1: Phone Masking Privacy Rules ──────────────────────────
  console.log('\n--- 1. Testing Phone Masking Privacy (Phase 12) ---');
  const masked1 = maskPhoneNumber('+91 9876543210');
  assert(masked1 === '+91 98*****210', `+91 9876543210 masked correctly -> ${masked1}`);

  const masked2 = maskPhoneNumber('+919876543210');
  assert(masked2 === '+91 98*****210', `+919876543210 masked correctly -> ${masked2}`);

  const masked3 = maskPhoneNumber('9876543210');
  assert(masked3 === '98*****210', `9876543210 masked correctly -> ${masked3}`);

  const masked4 = maskPhoneNumber(null);
  assert(masked4 === '', `null phone safely returns empty string`);

  const masked5 = maskPhoneNumber('');
  assert(masked5 === '', `empty phone safely returns empty string`);

  // ── TEST SUITE 2: Connect DB and Query Real Production Orders ──────────
  console.log('\n--- 2. Connecting to MongoDB & Inspecting Real Orders ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sklp_db');
  console.log('Connected to MongoDB.');

  const realOrder = await Order.findOne().sort({ createdAt: -1 }).populate('userId');
  assert(realOrder !== null, `Found existing real order #${realOrder?.orderNumber || realOrder?._id}`);

  if (!realOrder) {
    console.error('No real orders found to test. Aborting.');
    await mongoose.disconnect();
    return;
  }

  // ── TEST SUITE 3: Test Admin & Customer Users / Tokens ─────────────────
  console.log('\n--- 3. Testing RBAC & Tokens ---');
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.findOne();
  }
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  let customerUser = await User.findOne({ role: 'customer' });
  if (!customerUser) {
    customerUser = await User.create({
      firstName: 'TestCustomer',
      lastName: 'Security',
      email: `customer_sec_${Date.now()}@stylestreet.test`,
      password: 'HashPassword123!',
      role: 'customer'
    });
  }
  const customerToken = jwt.sign(
    { id: customerUser._id.toString(), email: customerUser.email, role: 'customer' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // ── TEST SUITE 4: Backend API Invocations ──────────────────────────────
  console.log('\n--- 4. Testing Admin Order Receipt Controller Logic ---');
  const { getAdminOrderReceipt, getSellerOrderReceipt } = await import('../controllers/receiptController.js');

  // Mock Request & Response objects
  const createMockRes = () => {
    return {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
  };

  // Test Admin Receipt Fetch
  const adminReq = {
    user: { id: adminUser._id.toString(), role: 'admin' },
    params: { orderId: realOrder._id.toString() }
  };
  const adminRes = createMockRes();

  await getAdminOrderReceipt(adminReq, adminRes);
  assert(adminRes.statusCode === 200, 'Admin receipt endpoint returns 200 OK');
  assert(adminRes.jsonData?.success === true, 'Admin receipt returned success: true');

  const receipt = adminRes.jsonData?.receipt;
  assert(receipt?.orderNumber === realOrder.orderNumber, `Real orderNumber matched: ${receipt?.orderNumber}`);
  assert(receipt?.invoiceNumber && receipt.invoiceNumber.startsWith('INV-'), `Invoice number generated/persisted: ${receipt?.invoiceNumber}`);
  assert(!JSON.stringify(receipt).includes(adminUser.password || 'HashPassword'), 'Zero passwords leaked');
  assert(!receipt?.items?.[0]?.image && !receipt?.items?.[0]?.images, 'Product images strictly absent (text only)');
  assert(receipt?.customer?.maskedPhone?.includes('*') || receipt?.customer?.maskedPhone === '', `Customer phone masked: ${receipt?.customer?.maskedPhone}`);
  assert(receipt?.primaryBarcode, `Primary barcode present: ${receipt?.primaryBarcode}`);
  assert(receipt?.trackingQRUrl?.includes('/orders/'), `Tracking QR URL generated: ${receipt?.trackingQRUrl}`);

  // Test Idempotency & Stability (Phase 29 & 33 Test J)
  const adminRes2 = createMockRes();
  await getAdminOrderReceipt(adminReq, adminRes2);
  assert(adminRes2.jsonData?.receipt?.invoiceNumber === receipt.invoiceNumber, `Stable invoice number on repeated views: ${receipt.invoiceNumber}`);
  assert(adminRes2.jsonData?.receipt?.orderNumber === receipt.orderNumber, 'Stable orderNumber across calls');

  // ── TEST SUITE 5: Seller Isolation & IDOR Protection (Phase 5, 6, 32) ──
  console.log('\n--- 5. Testing Seller Isolation & IDOR Protection ---');
  let sellerA = await Seller.findOne();
  if (!sellerA) {
    sellerA = await Seller.create({
      userId: customerUser._id,
      shopName: 'Seller Store Alpha',
      shopSlug: 'seller-store-alpha',
      brandName: 'ALPHA COUTURE',
      verificationStatus: 'verified',
      sellerStatus: 'active'
    });
  }

  // Create or resolve Seller B (unrelated seller)
  let sellerB = await Seller.findOne({ _id: { $ne: sellerA._id } });
  if (!sellerB) {
    const dummyUserB = await User.create({
      firstName: 'SellerB',
      lastName: 'Merchant',
      email: `seller_b_${Date.now()}@stylestreet.test`,
      password: 'HashPassword123!',
      role: 'seller'
    });
    sellerB = await Seller.create({
      userId: dummyUserB._id,
      shopName: 'Seller Store Beta',
      shopSlug: `seller-store-beta-${Date.now()}`,
      brandName: 'BETA LUXURY',
      verificationStatus: 'verified',
      sellerStatus: 'active'
    });
  }

  // Attach Seller A to realOrder items or suborder to simulate owned order
  await Order.updateOne(
    { _id: realOrder._id },
    {
      $set: {
        'items.0.sellerId': sellerA._id,
        sellerSuborders: [{
          suborderId: `SUB_${realOrder.orderNumber}_1`,
          sellerId: sellerA._id,
          shopNameSnapshot: sellerA.shopName,
          items: [{
            productId: realOrder.items[0]?.productId,
            productName: realOrder.items[0]?.productName || 'Silk Sherwani',
            brand: sellerA.brandName,
            quantity: 1,
            price: 5000,
            finalPrice: 5000
          }],
          subtotal: 5000,
          status: 'confirmed'
        }]
      }
    }
  );

  // Seller A accesses own order -> Must PASS 200 OK
  const sellerAReq = {
    user: { id: sellerA.userId.toString(), role: 'seller' },
    params: { orderId: realOrder._id.toString() }
  };
  const sellerARes = createMockRes();
  await getSellerOrderReceipt(sellerAReq, sellerARes);
  assert(sellerARes.statusCode === 200, 'Seller A successfully accesses Seller A order');
  assert(sellerARes.jsonData?.receipt?.seller?.brandName === sellerA.brandName, `Brand locked to approved DB record: ${sellerARes.jsonData?.receipt?.seller?.brandName}`);
  assert(!sellerARes.jsonData?.receipt?.items?.[0]?.image, 'Seller label contains no product image');

  // Seller B accesses Seller A order -> Must FAIL with 403 Forbidden (IDOR Attack Prevention)
  const sellerBReq = {
    user: { id: sellerB.userId.toString(), role: 'seller' },
    params: { orderId: realOrder._id.toString() }
  };
  const sellerBRes = createMockRes();
  let idorBlocked = false;
  try {
    await getSellerOrderReceipt(sellerBReq, sellerBRes);
  } catch (err) {
    if (err.statusCode === 403) {
      idorBlocked = true;
    }
  }
  assert(idorBlocked, 'Seller B accessing Seller A order was BLOCKED with 403 Forbidden (IDOR Prevention PASS)');

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
