import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sklp_fashion_key_anji7206';
const API_BASE = 'http://localhost:5000/api';

async function testHttp() {
  console.log('--- Testing Live Express HTTP Routes ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sklp_db');

  const order = await Order.findOne().sort({ createdAt: -1 });
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) adminUser = await User.findOne();

  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  let customerUser = await User.findOne({ role: 'customer' });
  const customerToken = jwt.sign(
    { id: customerUser._id.toString(), email: customerUser.email, role: 'customer' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 1. Admin accesses admin receipt endpoint via HTTP
  try {
    const res = await axios.get(`${API_BASE}/admin/orders/${order._id}/receipt`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('[PASS] HTTP GET /api/admin/orders/:id/receipt status:', res.status);
    console.log('[PASS] Receipt orderNumber:', res.data.receipt.orderNumber);
    console.log('[PASS] Masked phone:', res.data.receipt.customer.maskedPhone);
  } catch (err) {
    console.error('[FAIL] Admin HTTP error:', err.response?.data || err.message);
  }

  // 2. Customer attempts to access admin receipt endpoint via HTTP -> Expect 403
  try {
    await axios.get(`${API_BASE}/admin/orders/${order._id}/receipt`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.error('[FAIL] Customer was able to access admin receipt endpoint!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('[PASS] HTTP Customer blocked from admin endpoint with 403 Forbidden');
    } else {
      console.log('[FAIL] Unexpected status:', err.response?.status);
    }
  }

  // 3. Customer attempts to access seller receipt endpoint via HTTP -> Expect 403
  try {
    await axios.get(`${API_BASE}/seller/orders/${order._id}/receipt`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.error('[FAIL] Customer was able to access seller receipt endpoint!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('[PASS] HTTP Customer blocked from seller endpoint with 403 Forbidden');
    } else {
      console.log('[FAIL] Unexpected status:', err.response?.status);
    }
  }

  await mongoose.disconnect();
}

testHttp().catch(console.error);
