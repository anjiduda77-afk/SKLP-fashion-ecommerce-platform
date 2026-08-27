import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

async function attachAdminPhone() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('📦 Connected to MongoDB Atlas')

    const targetPhone = '6301568113'
    const adminEmail = 'admin@sklp.com'

    // 1. Remove any temporary customer records holding this phone number
    const deleteResult = await User.deleteMany({
      phone: targetPhone,
      email: { $ne: adminEmail }
    })
    console.log(`🧹 Removed ${deleteResult.deletedCount} conflicting phone record(s)`)

    // 2. Attach phone number directly to the official Admin account
    let admin = await User.findOne({ email: adminEmail })
    if (!admin) {
      admin = await User.create({
        firstName: 'Anji',
        lastName: 'SKLP Admin',
        email: adminEmail,
        phone: targetPhone,
        password: 'AdminPassword123!',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        isPhoneVerified: true
      })
    } else {
      admin.phone = targetPhone
      admin.isPhoneVerified = true
      admin.role = 'admin'
      await admin.save()
    }

    console.log('\n👑 ADMIN ACCOUNT UPDATED & VERIFIED:')
    console.log(`   Name  : ${admin.firstName} ${admin.lastName}`)
    console.log(`   Email : ${admin.email}`)
    console.log(`   Phone : ${admin.phone}`)
    console.log(`   Role  : ${admin.role} (FULL ADMIN PRIVILEGES)`)
    console.log(`   Status: ${admin.status}`)

    process.exit(0)
  } catch (err) {
    console.error('❌ Failed to attach admin phone:', err)
    process.exit(1)
  }
}

attachAdminPhone()
