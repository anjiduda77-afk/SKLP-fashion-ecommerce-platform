import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import mongoose from 'mongoose'
import User from '../models/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API_BASE = 'http://localhost:5000/api'

async function testPhoneAdminLogin() {
  console.log('\n===============================================================')
  console.log('📱 TESTING ADMIN LOGIN VIA PHONE NUMBER (6301568113)')
  console.log('===============================================================\n')

  try {
    await mongoose.connect(process.env.MONGODB_URI)

    // 1. Send OTP
    console.log('--- 1. Send OTP to 6301568113 ---')
    const sendOtpRes = await axios.post(`${API_BASE}/auth/send-otp`, {
      phone: '6301568113'
    })
    console.log(`✅ [PASS] Send OTP: ${sendOtpRes.data.message}`)

    // 2. Set test OTP hash for verification
    const testOtp = sendOtpRes.data.devOtp || '654321'
    if (!sendOtpRes.data.devOtp) {
      const user = await User.findOne({ phone: '6301568113' })
      user.phoneOtp = crypto.createHash('sha256').update(testOtp).digest('hex')
      user.phoneOtpExpiry = new Date(Date.now() + 5 * 60 * 1000)
      await user.save()
    }

    // 3. Verify OTP
    console.log('\n--- 2. Verify OTP & Authenticate ---')
    const verifyRes = await axios.post(`${API_BASE}/auth/verify-otp`, {
      phone: '6301568113',
      otp: testOtp
    })

    console.log(`✅ [PASS] Verify OTP Successful!`)
    console.log(`   User Name : ${verifyRes.data.user.firstName} ${verifyRes.data.user.lastName}`)
    console.log(`   Email     : ${verifyRes.data.user.email}`)
    console.log(`   Phone     : ${verifyRes.data.user.phone}`)
    console.log(`   Role      : ${verifyRes.data.user.role} 👑`)

    if (verifyRes.data.user.role !== 'admin') {
      throw new Error(`Expected role 'admin', got '${verifyRes.data.user.role}'`)
    }

    // 4. Test Admin Access with Token
    console.log('\n--- 3. Verify Admin Route Access with Issued Token ---')
    const adminToken = verifyRes.data.token
    const adminDashRes = await axios.get(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })

    console.log(`✅ [PASS] Admin Dashboard Accessed!`)
    console.log(`   Total Sales Revenue: ₹${adminDashRes.data.metrics.totalSales}`)
    console.log(`   Total Orders Count : ${adminDashRes.data.metrics.totalOrders}`)

    console.log('\n===============================================================')
    console.log('🎉 PHONE NUMBER 6301568113 SUCCESSFULLY ATTACHED TO ADMIN!')
    console.log('===============================================================\n')

    process.exit(0)
  } catch (err) {
    console.error('❌ Phone Admin test failed:', err.response?.data || err.message)
    process.exit(1)
  }
}

testPhoneAdminLogin()
