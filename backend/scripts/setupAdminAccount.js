/**
 * SKLP PRODUCTION ADMIN BOOTSTRAP
 * ============================================================
 * Creates the first production Admin account from environment variables.
 * Run ONCE after a production database reset.
 *
 * Required .env variables:
 *   PRODUCTION_ADMIN_EMAIL=your@email.com
 *   PRODUCTION_ADMIN_PASSWORD=YourSecurePassword!
 *   PRODUCTION_ADMIN_FIRST_NAME=FirstName   (optional)
 *   PRODUCTION_ADMIN_LAST_NAME=LastName      (optional)
 *
 * Usage:
 *   node scripts/setupAdminAccount.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupAdmin() {
  // ── Read credentials from environment — NEVER hardcoded ─────
  const adminEmail = process.env.PRODUCTION_ADMIN_EMAIL;
  const adminPassword = process.env.PRODUCTION_ADMIN_PASSWORD;
  const adminFirstName = process.env.PRODUCTION_ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.PRODUCTION_ADMIN_LAST_NAME || 'SKLP';

  if (!adminEmail || !adminPassword) {
    console.error('\n❌ ERROR: PRODUCTION_ADMIN_EMAIL and PRODUCTION_ADMIN_PASSWORD');
    console.error('   must be set in your backend .env file.');
    console.error('\n   Example:');
    console.error('   PRODUCTION_ADMIN_EMAIL=youremail@domain.com');
    console.error('   PRODUCTION_ADMIN_PASSWORD=YourStrongPassword123!\n');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('\n❌ ERROR: PRODUCTION_ADMIN_PASSWORD must be at least 8 characters.\n');
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  SKLP PRODUCTION ADMIN BOOTSTRAP');
  console.log('══════════════════════════════════════════════════');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`⚠️  An admin account already exists: ${existingAdmin.email}`);
      console.log('   Updating credentials to match current .env settings...');
      existingAdmin.email = adminEmail;
      existingAdmin.password = adminPassword;
      existingAdmin.firstName = adminFirstName;
      existingAdmin.lastName = adminLastName;
      existingAdmin.isEmailVerified = true;
      existingAdmin.status = 'active';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log(`✅ Admin account updated: ${adminEmail}`);
    } else {
      // Create fresh admin
      const user = new User({
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        status: 'active',
        isActive: true,
        isEmailVerified: true,
        authProvider: 'email'
      });
      await user.save();
      console.log(`✅ Production Admin account created: ${adminEmail}`);
    }

    // Verify credentials
    const checkUser = await User.findOne({ email: adminEmail }).select('+password');
    const isMatch = await checkUser.comparePassword(adminPassword);

    console.log(`\n🔐 Password verification: ${isMatch ? '✅ PASS' : '❌ FAILED'}`);
    console.log(`👑 Admin ID:      ${checkUser._id}`);
    console.log(`👑 Custom ID:     ${checkUser.customUserId}`);
    console.log(`👑 Role:          ${checkUser.role}`);
    console.log(`👑 Email:         ${checkUser.email}`);
    console.log(`\n🚀 Admin is ready. Login at /login with your .env credentials.`);
    console.log('   IMPORTANT: Do not share your admin credentials.\n');

  } catch (err) {
    console.error('Error setting up admin account:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

setupAdmin();
