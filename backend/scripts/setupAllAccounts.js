import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.js'
import Seller from '../models/Seller.js'
import Subscription from '../models/Subscription.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

async function setupAllAccounts() {
  console.log('\n═════════════════════════════════════════════════════════════════')
  console.log('🚀 SKLP MULTI-ROLE ACCOUNTS INITIALIZATION & VERIFICATION')
  console.log('═════════════════════════════════════════════════════════════════\n')

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB Atlas\n')

    // 1. PRIMARY PRODUCTION ADMIN (anjiduda77@gmail.com)
    const prodAdminEmail = process.env.PRODUCTION_ADMIN_EMAIL || 'anjiduda77@gmail.com'
    const prodAdminPass = process.env.PRODUCTION_ADMIN_PASSWORD || 'Anji7206@@'
    
    let prodAdmin = await User.findOne({ email: prodAdminEmail })
    if (prodAdmin) {
      prodAdmin.password = prodAdminPass
      prodAdmin.role = 'admin'
      prodAdmin.status = 'active'
      prodAdmin.isActive = true
      prodAdmin.isEmailVerified = true
      await prodAdmin.save()
      console.log(`👑 [ADMIN] Verified & synchronized primary admin: ${prodAdminEmail}`)
    } else {
      prodAdmin = await User.create({
        firstName: 'Anji',
        lastName: 'SKLP Admin',
        email: prodAdminEmail,
        password: prodAdminPass,
        role: 'admin',
        status: 'active',
        isActive: true,
        isEmailVerified: true
      })
      console.log(`👑 [ADMIN] Created primary admin: ${prodAdminEmail}`)
    }

    // 2. STANDARD PREVIEW ADMIN (admin@sklp.com)
    let previewAdmin = await User.findOne({ email: 'admin@sklp.com' })
    if (previewAdmin) {
      previewAdmin.password = 'AdminPassword123!'
      previewAdmin.role = 'admin'
      previewAdmin.status = 'active'
      previewAdmin.isActive = true
      previewAdmin.isEmailVerified = true
      await previewAdmin.save()
      console.log('👑 [ADMIN] Verified & updated preview admin: admin@sklp.com')
    } else {
      previewAdmin = await User.create({
        firstName: 'Anji',
        lastName: 'SKLP Admin',
        email: 'admin@sklp.com',
        phone: '9876543210',
        password: 'AdminPassword123!',
        role: 'admin',
        status: 'active',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true
      })
      console.log('👑 [ADMIN] Created preview admin: admin@sklp.com')
    }

    // 3. SELLER ACCOUNT (seller@sklp.com)
    let sellerUser = await User.findOne({ email: 'seller@sklp.com' })
    if (sellerUser) {
      sellerUser.password = 'SellerPassword123!'
      sellerUser.role = 'seller'
      sellerUser.status = 'active'
      sellerUser.isActive = true
      sellerUser.isEmailVerified = true
      await sellerUser.save()
      console.log('🏬 [SELLER] Verified & updated seller user: seller@sklp.com')
    } else {
      sellerUser = await User.create({
        firstName: 'Vikram',
        lastName: 'Couture',
        email: 'seller@sklp.com',
        phone: '8888888888',
        password: 'SellerPassword123!',
        role: 'seller',
        status: 'active',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true
      })
      console.log('🏬 [SELLER] Created seller user: seller@sklp.com')
    }

    // Ensure Seller Store Document exists & is APPROVED
    let sellerDoc = await Seller.findOne({ userId: sellerUser._id })
    if (!sellerDoc) {
      sellerDoc = await Seller.create({
        userId: sellerUser._id,
        shopName: 'SKLP Atelier',
        shopSlug: 'sklp-atelier',
        brandName: 'SKLP Atelier',
        brandNameNormalized: 'sklpatelier',
        businessType: 'individual',
        approvalStatus: 'APPROVED',
        verificationStatus: 'verified',
        sellerStatus: 'active',
        subscriptionStatus: 'trial',
        currentPlan: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        bankDetails: {
          accountName: 'SKLP Atelier Store',
          accountNumber: '123456789012',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          isVerified: true
        }
      })
      console.log('🏬 [SELLER] Created approved Seller store profile: SKLP Atelier')
    } else {
      sellerDoc.approvalStatus = 'APPROVED'
      sellerDoc.sellerStatus = 'active'
      sellerDoc.verificationStatus = 'verified'
      await sellerDoc.save()
      console.log('🏬 [SELLER] Verified existing Seller store profile: ' + sellerDoc.shopName)
    }

    // Ensure 30-Day Free Trial Subscription
    let sub = await Subscription.findOne({ sellerId: sellerDoc._id })
    if (!sub) {
      await Subscription.create({
        sellerId: sellerDoc._id,
        plan: 'trial',
        amount: 0,
        status: 'TRIAL',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      console.log('🏬 [SELLER] Initialized 30-Day Free Trial Subscription')
    }

    // 4. DELIVERY PARTNER ACCOUNT (delivery@sklp.com)
    let deliveryUser = await User.findOne({ email: 'delivery@sklp.com' })
    if (deliveryUser) {
      deliveryUser.password = 'DeliveryPassword123!'
      deliveryUser.role = 'delivery'
      deliveryUser.status = 'active'
      deliveryUser.isActive = true
      deliveryUser.isEmailVerified = true
      await deliveryUser.save()
      console.log('🚚 [DELIVERY] Verified & updated delivery partner: delivery@sklp.com')
    } else {
      deliveryUser = await User.create({
        firstName: 'Suresh',
        lastName: 'Express',
        email: 'delivery@sklp.com',
        phone: '7777777777',
        password: 'DeliveryPassword123!',
        role: 'delivery',
        status: 'active',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true
      })
      console.log('🚚 [DELIVERY] Created delivery partner: delivery@sklp.com')
    }

    // 5. CUSTOMER ACCOUNT (customer@sklp.com)
    let customerUser = await User.findOne({ email: 'customer@sklp.com' })
    if (customerUser) {
      customerUser.password = 'CustomerPassword123!'
      customerUser.role = 'customer'
      customerUser.status = 'active'
      customerUser.isActive = true
      customerUser.isEmailVerified = true
      await customerUser.save()
      console.log('🛍️  [CUSTOMER] Verified & updated customer: customer@sklp.com')
    } else {
      customerUser = await User.create({
        firstName: 'Rakesh',
        lastName: 'Kumar',
        email: 'customer@sklp.com',
        phone: '9999999999',
        password: 'CustomerPassword123!',
        role: 'customer',
        status: 'active',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        addresses: [
          {
            _id: new mongoose.Types.ObjectId(),
            type: 'home',
            street: 'Flat 402, Golden Towers, Gachibowli',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500032',
            country: 'India',
            isDefault: true
          }
        ]
      })
      console.log('🛍️  [CUSTOMER] Created customer: customer@sklp.com')
    }

    console.log('\n═════════════════════════════════════════════════════════════════')
    console.log('🎉 ALL 4 ACCOUNT TYPES SUCCESSFULLY READY IN MONGODB ATLAS!')
    console.log('═════════════════════════════════════════════════════════════════\n')
    console.log('Credentials Summary:')
    console.log('  👑 1. Primary Admin:    anjiduda77@gmail.com  /  Anji7206@@')
    console.log('  👑 2. Preview Admin:    admin@sklp.com        /  AdminPassword123!')
    console.log('  🏬 3. Seller Merchant:  seller@sklp.com       /  SellerPassword123!')
    console.log('  🚚 4. Delivery Partner: delivery@sklp.com     /  DeliveryPassword123!')
    console.log('  🛍️  5. Shopper Customer: customer@sklp.com     /  CustomerPassword123!')
    console.log('\n═════════════════════════════════════════════════════════════════\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Fatal error setting up accounts:', err)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  }
}

setupAllAccounts()
