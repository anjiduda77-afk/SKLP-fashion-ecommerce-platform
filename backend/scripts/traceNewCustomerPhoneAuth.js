import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { normalizeIndianPhone } from '../controllers/authController.js'

async function traceNewUserFlow() {
  console.log('--- STARTING NEW USER FLOW TRACE ---')
  console.log('[MONGODB] Connecting...')
  await mongoose.connect(process.env.MONGODB_URI)
  
  const db = mongoose.connection.db
  console.log(`[MONGODB] Connected database name: ${mongoose.connection.name}`)
  console.log(`[MONGODB] User collection: ${User.collection.name}`)

  // Check collection indexes
  const indexes = await db.collection('users').indexes()
  console.log('[MONGODB] Collection indexes:', indexes.map(i => ({ name: i.name, key: i.key, unique: i.unique, sparse: i.sparse })))

  // Simulate a brand-new phone number and firebaseUid
  const testPhone = '+919988776655'
  const testUid = 'firebase_test_uid_' + Date.now()
  
  console.log('\n--- Step 1: Testing Phone Normalization ---')
  const cleanPhone = normalizeIndianPhone(testPhone)
  console.log('Input phone:', testPhone, '-> Normalized:', cleanPhone)

  console.log('\n--- Step 2: Testing User.findOne Query ---')
  const query = []
  if (testUid) query.push({ firebaseUid: testUid })
  if (cleanPhone) query.push({ phone: cleanPhone })

  console.log('[MONGODB] Searching for user with query:', JSON.stringify(query))
  let existingUser = await User.findOne({ $or: query })
  console.log('[MONGODB] Existing user:', existingUser ? 'YES (ID: ' + existingUser._id + ')' : 'NO')

  // Clean up any test user if exists
  if (existingUser) {
    console.log('Cleaning up existing test user...')
    await User.deleteOne({ _id: existingUser._id })
    existingUser = null
  }

  console.log('\n--- Step 3: Testing User.create for New Customer ---')
  console.log('[MONGODB] New user creation started')
  console.log('[MONGODB] User.create called')

  try {
    const newUser = await User.create({
      firstName: 'Customer',
      lastName: 'User',
      email: undefined,
      phone: cleanPhone,
      firebaseUid: testUid,
      authProvider: 'firebase',
      role: 'customer',
      status: 'active',
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: true
    })

    console.log('[MONGODB] User created successfully! ID:', newUser._id)
    console.log('Created User document:', JSON.stringify(newUser.toJSON(), null, 2))

    // Step 4: Verify in DB directly
    const foundDirectly = await db.collection('users').findOne({ _id: newUser._id })
    console.log('\n--- Step 4: Direct DB Verification ---')
    console.log('Direct DB findOne result:', foundDirectly ? 'FOUND IN DB ✅' : 'NOT FOUND ❌')
    console.log('DB document fields:', Object.keys(foundDirectly || {}))

    // Step 5: Test adding refresh tokens (issueAuthTokens simulation)
    console.log('\n--- Step 5: Testing addRefreshToken & save ---')
    await newUser.addRefreshToken('dummy_refresh_token', 'Desktop - Test', '127.0.0.1')
    newUser.lastLogin = new Date()
    newUser.lastLoginIP = '127.0.0.1'
    newUser.lastLoginDevice = 'Desktop - Test'
    await newUser.save()
    console.log('addRefreshToken & save succeeded! ✅')

    // Clean up test user
    await User.deleteOne({ _id: newUser._id })
    console.log('Cleaned up test record.')

  } catch (err) {
    console.error('❌ [MONGODB] User creation failed!')
    console.error('Error name:', err.name)
    console.error('Error message:', err.message)
    if (err.errors) {
      console.error('Validation errors:', Object.keys(err.errors).map(k => ({
        field: k,
        message: err.errors[k].message,
        kind: err.errors[k].kind,
        value: err.errors[k].value
      })))
    }
    if (err.code) {
      console.error('Mongo Error Code:', err.code)
      console.error('Key Pattern:', err.keyPattern)
      console.error('KeyValue:', err.keyValue)
    }
  }

  await mongoose.disconnect()
  console.log('\n--- TRACE COMPLETE ---')
}

traceNewUserFlow().catch(console.error)
