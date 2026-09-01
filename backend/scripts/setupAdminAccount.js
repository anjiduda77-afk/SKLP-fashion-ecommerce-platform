import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupAdmin() {
  const targetEmail = 'anjiduda77@gmail.com';
  const targetPassword = 'Anji7206@@';

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas\n');

    let user = await User.findOne({ email: targetEmail });

    if (user) {
      console.log(`Found existing user: ${user.email} (Current Role: ${user.role})`);
      user.role = 'admin';
      user.status = 'active';
      user.isActive = true;
      user.password = targetPassword;
      user.isEmailVerified = true;
      user.firstName = user.firstName && user.firstName !== 'Customer' ? user.firstName : 'Anji';
      user.lastName = user.lastName && user.lastName !== 'User' ? user.lastName : 'Duda';
      await user.save();
      console.log(`✅ Successfully updated ${targetEmail} to role: "admin" with updated password.`);
    } else {
      console.log(`User ${targetEmail} not found. Creating new Admin user...`);
      user = new User({
        firstName: 'Anji',
        lastName: 'Duda',
        email: targetEmail,
        password: targetPassword,
        role: 'admin',
        status: 'active',
        isActive: true,
        isEmailVerified: true,
        authProvider: 'email'
      });
      await user.save();
      console.log(`✅ Successfully created new Admin account for ${targetEmail}`);
    }

    // Verify login credentials against comparePassword
    const checkUser = await User.findOne({ email: targetEmail }).select('+password');
    const isMatch = await checkUser.comparePassword(targetPassword);
    console.log(`🔐 Password comparison check: ${isMatch ? 'MATCH (Verified)' : 'FAILED'}`);
    console.log(`👑 User ID: ${checkUser._id}`);
    console.log(`👑 Custom User ID: ${checkUser.customUserId}`);
    console.log(`👑 Role: ${checkUser.role}`);
    console.log(`👑 Email: ${checkUser.email}`);

  } catch (err) {
    console.error('Error setting up admin account:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

setupAdmin();
