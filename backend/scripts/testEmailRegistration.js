import 'dotenv/config'
import mongoose from 'mongoose'
import axios from 'axios'
import User from '../models/User.js'

async function testEmailRegistration() {
  console.log('--- TESTING EMAIL REGISTRATION END-TO-END ---')

  const testEmail = `testuser_${Date.now()}@example.com`
  const testPassword = 'Password@123'
  const firstName = 'Test'
  const lastName = 'Customer'

  console.log('Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI)

  console.log('\n--- Step 1: Testing Direct Mongoose User.create ---')
  try {
    const { isValid, errors } = User.validatePasswordStrength(testPassword)
    console.log('Password validation result:', { isValid, errors })

    const user = await User.create({
      firstName,
      lastName,
      email: testEmail,
      password: testPassword,
      role: 'customer',
      authProvider: 'email',
      status: 'active',
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false
    })

    console.log('User created successfully via Mongoose! ID:', user._id)
    console.log('Password field selected by default?', user.password ? 'YES (unsafe)' : 'NO (safe select:false)')

    // Verify password comparing
    const userWithPassword = await User.findById(user._id).select('+password')
    const matches = await userWithPassword.comparePassword(testPassword)
    console.log('Password hash verification matches correct password?', matches ? 'YES ✅' : 'NO ❌')

    // Clean up
    await User.deleteOne({ _id: user._id })
    console.log('Direct Mongoose test cleaned up.')
  } catch (err) {
    console.error('Direct Mongoose creation error:', err)
  }

  await mongoose.disconnect()
  console.log('--- TEST COMPLETE ---')
}

testEmailRegistration().catch(console.error)
