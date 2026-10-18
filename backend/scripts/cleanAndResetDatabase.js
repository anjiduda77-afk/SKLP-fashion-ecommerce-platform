/**
 * SKLP CLEAN & RESET DATABASE SCRIPT
 * Cleans all demo accounts and test data.
 * Leaves ONLY the requested production admin account:
 *   Email: anjiduda77@gmail.com
 *   Password: Anji7206@@
 *   Role: admin
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Campaign from '../models/Campaign.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import Analytics from '../models/Analytics.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Seller from '../models/Seller.js';
import SellerApplication from '../models/SellerApplication.js';
import SellerSettlement from '../models/SellerSettlement.js';
import SellerOffer from '../models/SellerOffer.js';
import MarketingAuditLog from '../models/MarketingAuditLog.js';
import MarketingAsset from '../models/MarketingAsset.js';

const ADMIN_EMAIL = 'anjiduda77@gmail.com';
const ADMIN_PASSWORD = 'Anji7206@@';

async function run() {
  console.log('====================================================');
  console.log('🚀 CLEANING DATABASE & INITIALIZING SINGLE ADMIN');
  console.log('====================================================');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing in .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // 1. Delete all demo collections
  console.log('🗑️ Purging demo & test data...');
  const deletes = await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Wishlist.deleteMany({}),
    Coupon.deleteMany({}),
    Banner.deleteMany({}),
    Campaign.deleteMany({}),
    Notification.deleteMany({}),
    Review.deleteMany({}),
    Analytics.deleteMany({}),
    Payment.deleteMany({}),
    Subscription.deleteMany({}),
    Seller.deleteMany({}),
    SellerApplication.deleteMany({}),
    SellerSettlement.deleteMany({}),
    SellerOffer.deleteMany({}),
    MarketingAuditLog.deleteMany({}),
    MarketingAsset.deleteMany({})
  ]);

  console.log('✅ All demo collections successfully purged.\n');

  // 2. Create the solitary Master Admin account
  console.log(`👑 Creating Master Admin account: ${ADMIN_EMAIL}...`);
  const admin = new User({
    firstName: 'Admin',
    lastName: 'SKLP',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    status: 'active',
    isActive: true,
    isEmailVerified: true,
    authProvider: 'email',
    addresses: [],
    customUserId: 'ADM_00000001'
  });

  await admin.save();
  console.log('✅ Master Admin saved to MongoDB\n');

  // 3. Verify password check
  const verifyAdmin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
  const passwordMatch = await verifyAdmin.comparePassword(ADMIN_PASSWORD);

  if (!passwordMatch) {
    throw new Error('FATAL: Password verification failed after admin creation!');
  }

  // 4. Verification Count
  const totalUsers = await User.countDocuments({});
  console.log('====================================================');
  console.log('📊 POST-RESET DATABASE VERIFICATION');
  console.log('====================================================');
  console.log(`  Total Users in DB: ${totalUsers} (Expected: 1)`);
  console.log(`  Admin Email:       ${verifyAdmin.email}`);
  console.log(`  Admin Role:        ${verifyAdmin.role}`);
  console.log(`  Admin Status:      ${verifyAdmin.status}`);
  console.log(`  Email Verified:    ${verifyAdmin.isEmailVerified}`);
  console.log(`  Password Check:    ${passwordMatch ? '✅ VERIFIED (PASS)' : '❌ FAILED'}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  console.log('🎉 Database reset & Admin setup complete!');
}

run().catch(err => {
  console.error('❌ Error executing database reset:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
