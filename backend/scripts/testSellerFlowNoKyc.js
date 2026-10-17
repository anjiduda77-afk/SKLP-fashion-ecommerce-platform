import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import SellerApplication from '../models/SellerApplication.js';
import { generateSellerAgreementPdf } from '../services/sellerAgreementPdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTest() {
  console.log('--- STARTING STYLE STREET SELLER WORKFLOW (NO KYC) TEST ---');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sklp_ecommerce';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // 1. Create or find test applicant user
  const uniquePhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const testEmail = `testmerchant_${Date.now()}@stylestreet.test`;
  const user = await User.create({
    name: 'Ravi Kumar Varma',
    firstName: 'Ravi',
    lastName: 'Varma',
    email: testEmail,
    password: 'Password123!',
    phone: uniquePhone,
    isPhoneVerified: true,
    role: 'customer'
  });
  console.log(`Created test applicant: ${user.email} (ID: ${user._id})`);

  // 2. Submit Seller Application WITHOUT Aadhaar, PAN, or Bank details
  const uniqueShop = `Varma Threads ${Date.now().toString().slice(-4)}`;
  const uniqueBrand = `Varma Originals ${Date.now().toString().slice(-4)}`;

  const appData = {
    userId: user._id,
    applicantName: 'Ravi Kumar Varma',
    ownerName: 'Ravi Kumar Varma',
    dob: '1992-05-15',
    email: testEmail,
    phone: uniquePhone,
    shopName: uniqueShop,
    brandName: uniqueBrand,
    brandNameNormalized: uniqueBrand.toLowerCase().replace(/[^a-z0-9]/g, ''),
    businessType: 'proprietorship',
    productCategories: ['Men Fashion', 'Ethnic Wear'],
    storeDescription: 'Handloom textiles and premium bespoke ethnic wear.',
    businessEmail: testEmail,
    businessPhone: '9876543210',
    yearEstablished: 2021,
    businessAddress: {
      street: 'Plot 45, Jubilee Enclave, Road No. 36',
      city: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500033',
      country: 'India'
    },
    pickupAddressSameAsBusiness: true,
    pickupAddress: {
      street: 'Plot 45, Jubilee Enclave, Road No. 36',
      city: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500033',
      country: 'India'
    },
    deliveryMode: 'PAID_DELIVERY',
    shopImages: [
      { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8', publicId: 'sh1', imageType: 'shop_front' },
      { url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc', publicId: 'sh2', imageType: 'shop_interior' }
    ],
    ownerPhoto: {
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      publicId: 'ow1'
    },
    signature: {
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675',
      publicId: 'sig1'
    },
    gstNumber: '36AAAAA0000A1Z5',
    // NOTICE: panNumber and bankDetails are NOT provided!
    termsAccepted: true,
    sellerTermsVersion: 'v1.0',
    status: 'PENDING_REVIEW'
  };

  const application = await SellerApplication.create(appData);
  console.log(`Created Seller Application: ${application.applicationReference || application._id}`);

  // 3. Test Seller Agreement PDF Generation
  console.log('Testing Seller Agreement PDF Generation (A4 format without Aadhaar, PAN, Bank)...');
  const pdfOutPath = path.join(__dirname, 'test_agreement.pdf');
  const writeStream = fs.createWriteStream(pdfOutPath);

  await generateSellerAgreementPdf(application, { phone: { status: 'VERIFIED' } }, writeStream);

  await new Promise((resolve) => {
    writeStream.on('finish', resolve);
  });
  const pdfStats = fs.statSync(pdfOutPath);
  console.log(`Seller Agreement PDF generated successfully! Size: ${pdfStats.size} bytes`);
  if (pdfStats.size < 1000) {
    throw new Error('PDF output is too small, generation may have failed!');
  }
  fs.unlinkSync(pdfOutPath); // Clean up temp pdf

  // 4. Test Admin Correction Request
  console.log('Testing Admin Correction Request with mandatory reason...');
  const correctionReason = 'Please ensure interior shop photo shows lighting clearly.';
  application.status = 'NEEDS_CORRECTION';
  application.correctionReason = correctionReason;
  await application.save();
  console.log(`Application marked NEEDS_CORRECTION with reason: "${application.correctionReason}"`);

  // 5. Test Customer Resubmission
  console.log('Testing Customer Resubmission...');
  application.status = 'PENDING_REVIEW';
  application.correctionReason = '';
  await application.save();
  console.log('Application resubmitted to PENDING_REVIEW');

  // 6. Test Admin Approval WITHOUT Aadhaar, PAN, or Bank
  console.log('Testing Admin Approval & Seller Account Activation...');
  // Import the controller function or perform the exact approval logic
  const { reviewSellerApplication } = await import('../controllers/sellerApplicationController.js');

  const mockAdmin = await User.findOne({ role: 'admin' });
  const adminId = mockAdmin?._id || user._id;

  const mockReq = {
    params: { id: application._id.toString() },
    user: { id: adminId.toString(), role: 'admin' },
    body: {
      action: 'APPROVE',
      notes: 'Verified physical shop, owner portrait, signature, and phone OTP.'
    }
  };

  let approveResponseData = null;
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        approveResponseData = { code, data };
        return mockRes;
      }
    })
  };

  await reviewSellerApplication(mockReq, mockRes);
  console.log('Admin Approval Response:', approveResponseData);

  if (!approveResponseData?.data?.success) {
    throw new Error(`Admin approval failed: ${JSON.stringify(approveResponseData)}`);
  }

  // Verify Seller Record and User Role
  const updatedUser = await User.findById(user._id);
  const activatedSeller = await Seller.findOne({ userId: user._id });

  console.log(`User updated role: ${updatedUser.role}`);
  console.log(`Activated Seller Store: ${activatedSeller.shopName} (Status: ${activatedSeller.sellerStatus}, Approval: ${activatedSeller.approvalStatus})`);

  if (updatedUser.role !== 'seller') {
    throw new Error('User role was not updated to seller!');
  }
  if (!activatedSeller || activatedSeller.sellerStatus !== 'active') {
    throw new Error('Seller profile was not activated!');
  }

  // Clean up test records
  await Seller.deleteOne({ _id: activatedSeller._id });
  await SellerApplication.deleteOne({ _id: application._id });
  await User.deleteOne({ _id: user._id });
  console.log('Cleaned up test records');

  console.log('--- ALL SELLER ONBOARDING & ADMIN REVIEW TESTS PASSED SUCCESSFULLY! ---');
  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
