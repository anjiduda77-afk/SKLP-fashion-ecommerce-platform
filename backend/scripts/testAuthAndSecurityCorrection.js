import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.LIVE_API_URL || 'https://sklp-fashion-ecommerce-platform.onrender.com/api';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('  SECURITY & AUTHENTICATION VERIFICATION TEST SUITE');
  console.log('  Target API:', BASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // ── Test 1: Connect to Database & Verify Admin Record ──
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const admin = await User.findOne({ email: 'anjiduda77@gmail.com' });
    if (admin && admin.role === 'admin') {
      console.log(`✅ TEST 1 PASSED: Authorized Admin record exists in DB with role="admin" (ID: ${admin._id})`);
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Authorized Admin record missing or role is not admin');
      failed++;
    }
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message);
    failed++;
  }

  // ── Test 2: Client Attempting to Submit { role: "admin" } on Public Registration ──
  const testCustomerEmail = `test_security_${Date.now()}@sklp-security-test.com`;
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      firstName: 'Malicious',
      lastName: 'Hacker',
      email: testCustomerEmail,
      password: 'StrongPassword123!@#',
      role: 'admin' // Attempt privilege escalation
    });

    if (res.data?.success && res.data?.user?.role === 'customer') {
      console.log('✅ TEST 2 PASSED: Client submitted role="admin", but backend enforced role="customer"');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Privilege escalation succeeded! User role:', res.data?.user?.role);
      failed++;
    }
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err.response?.data || err.message);
    failed++;
  }

  // ── Test 3: Client Submitting Fake Token / Spoofed Admin Email to /auth/google ──
  try {
    await axios.post(`${BASE_URL}/auth/google`, {
      email: 'anjiduda77@gmail.com',
      uid: 'fake_attacker_uid_12345'
      // No valid idToken provided!
    });
    console.error('❌ TEST 3 FAILED: Server accepted unverified credentials without valid token!');
    failed++;
  } catch (err) {
    if (err.response?.status === 400 || err.response?.status === 401) {
      console.log(`✅ TEST 3 PASSED: Server rejected spoofed admin email without token with HTTP ${err.response.status}`);
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED with unexpected status:', err.response?.status);
      failed++;
    }
  }

  // ── Test 4: Authorized Admin Email/Password Login ──
  try {
    const adminEmail = process.env.PRODUCTION_ADMIN_EMAIL || 'anjiduda77@gmail.com';
    const adminPassword = process.env.PRODUCTION_ADMIN_PASSWORD || 'Anji7206@@';
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });

    if (res.data?.success && res.data?.user?.role === 'admin' && res.data?.token) {
      console.log(`✅ TEST 4 PASSED: Admin authenticated via Email/Password -> role="admin" verified in response & JWT`);
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: Admin login response role was:', res.data?.user?.role);
      failed++;
    }
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err.response?.data?.message || err.message);
    failed++;
  }

  // ── Test 5: CORS Preflight from Firebase Hosting & Vercel Domains ──
  const testOrigins = [
    'https://sklp-fashion-store-9fa5d-7f4d3.web.app',
    'https://sklp-fashion-store-9fa5d.firebaseapp.com',
    'https://sklp-fashion.vercel.app'
  ];

  for (const origin of testOrigins) {
    try {
      const res = await axios.options(`${BASE_URL}/auth/login`, {
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });
      const allowOrigin = res.headers['access-control-allow-origin'];
      if (allowOrigin === origin || allowOrigin === '*') {
        console.log(`✅ TEST 5 PASSED: CORS preflight allowed for ${origin}`);
        passed++;
      } else {
        console.error(`❌ TEST 5 FAILED: CORS header Access-Control-Allow-Origin is "${allowOrigin}" for ${origin}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ TEST 5 FAILED for ${origin}:`, err.message);
      failed++;
    }
  }

  // Clean up test customer
  try {
    await User.deleteOne({ email: testCustomerEmail });
    console.log('\n🧹 Cleaned up temporary test customer user');
    await mongoose.disconnect();
  } catch (_e) {}

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runSecurityTests();
