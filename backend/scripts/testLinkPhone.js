import 'dotenv/config'
import mongoose from 'mongoose'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const API_BASE = 'http://localhost:5000/api'

async function testLinkPhoneFlow() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI)

  const testEmail = `link_phone_test_${Date.now()}@sklp-fashion.com`
  const testPhone = '9948682179'

  // Clean up any user with this phone first
  await User.deleteMany({ phone: testPhone })

  // 1. Create a test authenticated user
  const user = await User.create({
    firstName: 'Anji',
    lastName: 'Tester',
    email: testEmail,
    role: 'customer',
    authProvider: 'email',
    isEmailVerified: true
  })

  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, provider: user.authProvider },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  console.log(`Created test user: ${user._id} (${user.email})`)

  try {
    // 2. Request OTP to link mobile number
    console.log('\n--- 1. Testing POST /api/auth/link-phone/send-otp ---')
    const sendRes = await axios.post(
      `${API_BASE}/auth/link-phone/send-otp`,
      { phone: testPhone },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    console.log('✅ send-otp status:', sendRes.status)
    console.log('   Response body:', sendRes.data)

    const receivedOtp = sendRes.data.devOtp
    console.log(`   Received OTP: ${receivedOtp}`)

    if (!receivedOtp) {
      throw new Error('devOtp was not returned in development mode response')
    }

    // 3. Verify OTP and link mobile number
    console.log('\n--- 2. Testing POST /api/auth/link-phone/verify ---')
    const verifyRes = await axios.post(
      `${API_BASE}/auth/link-phone/verify`,
      { phone: testPhone, otp: receivedOtp },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    console.log('✅ verify status:', verifyRes.status)
    console.log('   Response body:', verifyRes.data)

    // 4. Verify in DB
    const updatedUser = await User.findById(user._id)
    console.log('\n--- 3. Database Check ---')
    console.log('   User Phone in DB:', updatedUser.phone)
    console.log('   isPhoneVerified in DB:', updatedUser.isPhoneVerified)

    if (updatedUser.phone === testPhone && updatedUser.isPhoneVerified === true) {
      console.log('\n🎉 PHONE LINKING TEST PASSED 100% SUCCESSFULLY! ✅')
    } else {
      console.error('\n❌ DB state does not match expected verified phone.')
    }
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message)
  } finally {
    await User.findByIdAndDelete(user._id)
    await mongoose.disconnect()
    console.log('Cleaned up test user.')
  }
}

testLinkPhoneFlow()
