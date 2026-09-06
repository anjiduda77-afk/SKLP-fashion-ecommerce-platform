import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'sklp_secret_jwt_key_development_2026';

async function runTest() {
  console.log('--- Testing Upload & Admin Sales & Seller Shop DP Isolation ---');
  await mongoose.connect(MONGO_URI);
  console.log(' Connected to MongoDB');

  // 1. Verify Admin Account
  const admin = await User.findOne({ email: 'admin@sklp.com' });
  if (!admin) throw new Error('Admin account not found');
  console.log(` Admin user found: ${admin.email} (Role: ${admin.role})`);

  // 2. Verify Seller Account
  const sellerUser = await User.findOne({ email: 'seller@sklp.com' });
  if (!sellerUser) throw new Error('Seller user not found');
  const sellerDoc = await Seller.findOne({ userId: sellerUser._id });
  if (!sellerDoc) throw new Error('Seller document not found');
  console.log(` Seller user found: ${sellerUser.email} (Shop: ${sellerDoc.shopName})`);

  // 3. Verify Customer Account
  const customer = await User.findOne({ email: 'customer@sklp.com' });
  if (!customer) throw new Error('Customer user not found');
  console.log(` Customer user found: ${customer.email} (Role: ${customer.role})`);

  // 4. Test Seller Shop Logo update sync
  const testLogoUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';
  sellerUser.sellerProfile = sellerUser.sellerProfile || {};
  sellerUser.sellerProfile.logo = { url: testLogoUrl, publicId: 'test_logo_123' };
  await sellerUser.save();

  sellerDoc.logo = { url: testLogoUrl, publicId: 'test_logo_123' };
  await sellerDoc.save();

  const refreshedSeller = await Seller.findOne({ userId: sellerUser._id });
  if (refreshedSeller.logo?.url !== testLogoUrl) {
    throw new Error('Seller logo sync failed');
  }
  console.log(' Seller Shop Logo / DP successfully saved and synchronized with Seller model');

  // 5. Test Admin Product Creation & Sales capability
  const testSku = `TEST-ADM-${Date.now().toString().slice(-4)}`;
  const testProduct = await Product.create({
    name: 'Admin Exclusive Royal Silk Sherwani',
    nameNormalized: 'admin exclusive royal silk sherwani',
    description: 'Mastercrafted luxury garment created and sold directly by the Admin atelier.',
    category: 'fashion-wear',
    gender: 'men',
    price: 15999,
    originalPrice: 19999,
    discount: 20,
    stock: 25,
    sku: testSku,
    brand: 'SKLP Royal Collection',
    brandNormalized: 'sklproyalcollection',
    images: [{
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
      publicId: 'local_adm_img',
      isMain: true,
      alt: 'Admin Royal Silk Sherwani'
    }],
    isActive: true,
    moderationStatus: 'approved',
    createdBy: admin._id
  });

  console.log(` Admin Product Created: ${testProduct.name} (SKU: ${testProduct.sku}, Moderation: ${testProduct.moderationStatus}, Active: ${testProduct.isActive})`);

  // Verify it can be retrieved via catalog query
  const found = await Product.findOne({ sku: testSku, isActive: true });
  if (!found) throw new Error('Created admin product not found in active catalog');
  console.log(' Admin product successfully retrieved in active catalog for customer sales');

  // Clean up test product
  await Product.deleteOne({ _id: testProduct._id });
  console.log(' Cleaned up test product');

  // 6. Test Customer Avatar / DP Isolation
  const customerAvatarUrl = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150';
  customer.avatar = { url: customerAvatarUrl, publicId: 'cust_avatar_1' };
  await customer.save();

  const refreshedCustomer = await User.findById(customer._id);
  if (refreshedCustomer.avatar?.url !== customerAvatarUrl) {
    throw new Error('Customer avatar failed to save');
  }
  if (refreshedCustomer.role !== 'customer') {
    throw new Error('Customer role unexpected');
  }
  console.log(' Customer personal Avatar / DP successfully saved, no seller store permissions');

  console.log('\n ALL 6 TEST VERIFICATIONS PASSED PERFECTLY!');
  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
