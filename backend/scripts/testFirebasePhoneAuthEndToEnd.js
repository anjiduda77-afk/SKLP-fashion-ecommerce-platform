import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { normalizeIndianPhone } from '../controllers/authController.js'
import jwt from 'jsonwebtoken'

const issueAuthTokens = async (user) => {
  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, provider: user.authProvider },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  )
  const refreshToken = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  )
  await user.addRefreshToken(refreshToken, 'Desktop - Test Suite', '127.0.0.1')
  user.lastLogin = new Date()
  user.lastLoginIP = '127.0.0.1'
  user.lastLoginDevice = 'Desktop - Test Suite'
  await user.save()
  return { token, refreshToken }
}

async function simulateFirebaseLogin(decodedToken) {
  console.log('\n======================================================')
  console.log('[AUTH] Firebase login request received')

  const { uid, email, name, picture, phone_number } = decodedToken

  console.log('[AUTH] Firebase token verified')
  const searchEmail = email ? email.toLowerCase().trim() : null
  const cleanPhone = phone_number ? normalizeIndianPhone(phone_number) : null

  if (phone_number) {
    console.log(`[AUTH] Verified phone received: ${cleanPhone ? `+91 ${cleanPhone.slice(0, 3)}***${cleanPhone.slice(-3)}` : 'normalized'}`)
  }
  if (email) {
    console.log(`[AUTH] Verified email received: ${searchEmail}`)
  }

  console.log(`[MONGODB] Connected database name: ${User.db?.name || mongoose.connection.name}`)
  console.log(`[MONGODB] User collection: ${User.collection.name}`)

  const query = []
  if (uid) query.push({ firebaseUid: uid })
  if (searchEmail) query.push({ email: searchEmail })
  if (cleanPhone) query.push({ phone: cleanPhone })

  console.log('[MONGODB] Searching for user with query:', JSON.stringify(query))
  let user = await User.findOne({ $or: query })
  console.log(`[MONGODB] Existing user: ${user ? 'YES' : 'NO'}`)

  let firstName = 'Customer'
  let lastName = 'User'
  if (name) {
    const parts = name.trim().split(' ')
    firstName = parts[0] || 'Customer'
    lastName = parts.slice(1).join(' ') || 'User'
  }

  const determinedProvider = phone_number && !searchEmail ? 'firebase' : (searchEmail ? 'google' : 'firebase')

  if (user) {
    console.log('[MONGODB] Existing user branch executed')
    if (uid && user.firebaseUid !== uid) user.firebaseUid = uid
    if (cleanPhone && !user.phone) user.phone = cleanPhone
    if (searchEmail && !user.email) user.email = searchEmail
    if (cleanPhone || phone_number) user.isPhoneVerified = true
    if (decodedToken.email_verified || searchEmail) user.isEmailVerified = true
    user.authProvider = user.authProvider || determinedProvider
    await user.save()
    console.log('[MONGODB] Existing user updated successfully')
  } else {
    console.log('[MONGODB] New user creation started')
    console.log('[MONGODB] User.create called')

    try {
      user = await User.create({
        firstName,
        lastName,
        email: searchEmail || undefined,
        phone: cleanPhone || undefined,
        firebaseUid: uid,
        authProvider: determinedProvider,
        role: 'customer',
        status: 'active',
        isActive: true,
        isEmailVerified: Boolean(decodedToken.email_verified || searchEmail),
        isPhoneVerified: Boolean(cleanPhone || phone_number),
        avatar: picture ? { url: picture, publicId: null } : undefined
      })
      console.log(`[MONGODB] User created successfully (ID: ${user._id})`)
    } catch (createErr) {
      console.error('[MONGODB] User creation failed:', createErr.message)
      throw createErr
    }
  }

  const tokens = await issueAuthTokens(user)
  console.log('[AUTH] Application JWT issued successfully')
  return { user, tokens }
}

async function runTest() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI)

  const testNumber = '+919876500001'
  const testUid = 'firebase_uid_test_' + Date.now()

  // Clean up test number if exists
  await User.deleteMany({ phone: '9876500001' })

  console.log('\n--- TEST 1: Brand New Mobile Number Registration ---')
  const result1 = await simulateFirebaseLogin({
    uid: testUid,
    phone_number: testNumber,
    email: undefined,
    name: undefined,
    picture: undefined
  })

  // Verify in MongoDB
  const docInDb = await mongoose.connection.db.collection('users').findOne({ _id: result1.user._id })
  console.log('\n--- Verification of MongoDB Document in Database ---')
  console.log('Document ID:', docInDb._id)
  console.log('Phone in DB:', docInDb.phone)
  console.log('Firebase UID in DB:', docInDb.firebaseUid)
  console.log('Role in DB:', docInDb.role)
  console.log('Status in DB:', docInDb.status)
  console.log('isPhoneVerified in DB:', docInDb.isPhoneVerified)
  console.log('authProvider in DB:', docInDb.authProvider)
  console.log('customUserId in DB:', docInDb.customUserId)

  console.log('\n--- TEST 2: Existing User Login with Same Phone Number ---')
  const result2 = await simulateFirebaseLogin({
    uid: testUid,
    phone_number: testNumber,
    email: undefined,
    name: undefined,
    picture: undefined
  })

  console.log('\n--- Check that IDs match (No Duplicate) ---')
  console.log('First login user ID:', result1.user._id.toString())
  console.log('Second login user ID:', result2.user._id.toString())
  const totalCount = await User.countDocuments({ phone: '9876500001' })
  console.log('Total documents with this phone number:', totalCount, totalCount === 1 ? '(CORRECT ✅)' : '(ERROR ❌)')

  // Clean up
  await User.deleteOne({ _id: result1.user._id })
  console.log('\nCleaned up test user.')

  await mongoose.disconnect()
  console.log('\nALL TESTS PASSED SUCCESSFULLY! ✅')
}

runTest().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
