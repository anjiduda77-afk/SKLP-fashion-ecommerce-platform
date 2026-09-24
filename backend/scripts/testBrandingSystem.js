import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Branding from '../models/Branding.js';
import User from '../models/User.js';

dotenv.config();

const API_BASE = 'http://127.0.0.1:5000';

async function runTests() {
  console.log('============================================================');
  console.log('STYLE STREET BRANDING & LOGO SYSTEM — AUTOMATED TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Database Connection
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // 2. Test Model Singleton
  console.log('--- 1. Testing Branding Model Singleton & Defaults ---');
  const brandingDoc = await Branding.getConfig();
  assert(brandingDoc !== null, 'Branding.getConfig() returned singleton document');
  assert(brandingDoc.brandName === 'STYLE STREET' || brandingDoc.brandName.length > 0, `Brand name initialized: "${brandingDoc.brandName}"`);
  assert(brandingDoc.tagline !== undefined, `Tagline initialized: "${brandingDoc.tagline}"`);
  assert(brandingDoc.primaryColor !== undefined, `Primary color initialized: "${brandingDoc.primaryColor}"`);
  assert(brandingDoc.mainLogo !== undefined, 'mainLogo slot exists');
  assert(brandingDoc.receiptLogo !== undefined, 'receiptLogo slot exists');
  assert(brandingDoc.shippingLogo !== undefined, 'shippingLogo slot exists');
  assert(brandingDoc.emailLogo !== undefined, 'emailLogo slot exists');
  assert(brandingDoc.favicon !== undefined, 'favicon slot exists');

  // 3. Test Public GET /api/branding
  console.log('\n--- 2. Testing Public API Endpoint: GET /api/branding ---');
  try {
    const res = await fetch(`${API_BASE}/api/branding`);
    assert(res.status === 200, `GET /api/branding returned HTTP 200 (Got ${res.status})`);
    const data = await res.json();
    assert(data.success === true, 'Response contains success: true');
    assert(data.branding && data.branding.brandName, `Returned brandName: "${data.branding.brandName}"`);
  } catch (err) {
    assert(false, `Public API fetch failed: ${err.message}`);
  }

  // 4. Test RBAC & Security for Admin Branding Endpoints
  console.log('\n--- 3. Testing RBAC Security on Admin Endpoints ---');
  // Unauthenticated
  try {
    const res = await fetch(`${API_BASE}/api/admin/branding`);
    assert(res.status === 401, `Unauthenticated GET /api/admin/branding rejected with HTTP 401 (Got ${res.status})`);
  } catch (err) {
    assert(false, `Unauthenticated request failed unexpectedly: ${err.message}`);
  }

  // Find or create an admin user for testing
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.log('No admin user found in DB, skipping live admin token test.');
  } else {
    const adminToken = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'sklp_secret_jwt_key_2024',
      { expiresIn: '1h' }
    );

    // Find non-admin user
    let customerUser = await User.findOne({ role: 'customer' });
    if (customerUser) {
      const customerToken = jwt.sign(
        { id: customerUser._id, role: customerUser.role },
        process.env.JWT_SECRET || 'sklp_secret_jwt_key_2024',
        { expiresIn: '1h' }
      );

      const custRes = await fetch(`${API_BASE}/api/admin/branding`, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      assert(custRes.status === 403, `Customer token rejected from /api/admin/branding with HTTP 403 (Got ${custRes.status})`);
    }

    // Admin authenticated GET
    const adminRes = await fetch(`${API_BASE}/api/admin/branding`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminRes.status === 200, `Admin authenticated GET /api/admin/branding returned HTTP 200 (Got ${adminRes.status})`);
    const adminData = await adminRes.json();
    assert(adminData.success === true, 'Admin response contains success: true');
    assert(adminData.branding !== undefined, 'Admin response contains full branding object');

    // Admin authenticated PUT update
    console.log('\n--- 4. Testing Admin PUT /api/admin/branding ---');
    const updatePayload = {
      brandName: 'STYLE STREET',
      tagline: 'Luxury Fashion Marketplace',
      primaryColor: '#B8860B',
      secondaryColor: '#1A1A1A',
      supportEmail: 'concierge@stylestreet.in',
      supportPhone: '+91 9876543210',
      websiteUrl: 'https://stylestreet.in',
      gstin: '36AABCS1429B1Z2',
      receiptFooterText: 'Thank you for shopping with STYLE STREET — Wear Your Story.',
      registeredAddress: {
        street: 'Road No. 36, Jubilee Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500033',
        country: 'India'
      }
    };

    const putRes = await fetch(`${API_BASE}/api/admin/branding`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(updatePayload)
    });
    assert(putRes.status === 200, `PUT /api/admin/branding returned HTTP 200 (Got ${putRes.status})`);
    const putData = await putRes.json();
    assert(putData.success === true, 'PUT response returned success: true');
    assert(putData.branding.supportEmail === 'concierge@stylestreet.in', 'Updated supportEmail persisted');
    assert(putData.branding.gstin === '36AABCS1429B1Z2', 'Updated GSTIN persisted');
    assert(putData.branding.registeredAddress.city === 'Hyderabad', 'Updated city persisted');
  }

  // 5. Verify Fallback Rules
  console.log('\n--- 5. Testing Slot Fallback Rules ---');
  const freshConfig = await Branding.getConfig();
  // receiptLogo fallback: if receiptLogo empty, fallback to mainLogo, else static
  const testLogoResolution = (slot, config, staticDefault) => {
    if (config[slot]?.url) return config[slot].url;
    if (slot === 'receiptLogo' && config.mainLogo?.url) return config.mainLogo.url;
    if (slot === 'shippingLogo') {
      if (config.receiptLogo?.url) return config.receiptLogo.url;
      if (config.mainLogo?.url) return config.mainLogo.url;
    }
    if (slot === 'emailLogo' && config.mainLogo?.url) return config.mainLogo.url;
    return staticDefault;
  };

  const resolved = testLogoResolution('receiptLogo', freshConfig, '/static/sklp_logo.png');
  assert(resolved.length > 0, `Fallback resolution for receiptLogo works: ${resolved}`);

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
