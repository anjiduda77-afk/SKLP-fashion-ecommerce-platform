import 'dotenv/config'
import mongoose from 'mongoose'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import authRoutes from '../routes/authRoutes.js'
import { errorHandler } from '../middleware/errorHandler.js'
import User from '../models/User.js'

async function runRegisterHttpTrace() {
  console.log('--- STARTING REGISTER HTTP TRACE TEST ---')
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('[MONGODB] Connected database name:', mongoose.connection.name)

  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  app.use(errorHandler)

  const server = app.listen(5099, async () => {
    console.log('Test server running on port 5099')

    const testEmail = `realtest_${Date.now()}@sklp-luxury.com`
    const testPassword = 'Password@2026'

    console.log('\n--- Step 1: Submitting New Customer Registration ---')
    console.log('[REGISTER] Submit started')
    console.log('[REGISTER] API URL: http://localhost:5099/api/auth/register')
    console.log('[REGISTER] Payload fields:', {
      firstName: 'Anji',
      lastName: 'Duda',
      email: testEmail,
      hasPassword: true
    })

    try {
      const res = await axios.post('http://localhost:5099/api/auth/register', {
        firstName: 'Anji',
        lastName: 'Duda',
        email: testEmail,
        password: testPassword
      })

      console.log('[REGISTER] Response status:', res.status)
      console.log('[REGISTER] Response success:', res.data.success)
      console.log('[REGISTER] Returned User ID:', res.data.user?._id)
      console.log('[REGISTER] Token issued?', Boolean(res.data.token))

      // Direct DB Verification
      const dbDoc = await User.findById(res.data.user._id)
      console.log('\n--- Step 2: Direct MongoDB Database Verification ---')
      console.log('MongoDB document found in DB:', dbDoc ? 'YES ✅' : 'NO ❌')
      console.log('MongoDB saved role:', dbDoc?.role)
      console.log('MongoDB saved email:', dbDoc?.email)
      console.log('MongoDB saved status:', dbDoc?.status)
      console.log('MongoDB saved isActive:', dbDoc?.isActive)
      console.log('MongoDB isEmailVerified:', dbDoc?.isEmailVerified)
      console.log('MongoDB isPhoneVerified:', dbDoc?.isPhoneVerified)

      console.log('\n--- Step 3: Testing Duplicate Email Prevention ---')
      try {
        await axios.post('http://localhost:5099/api/auth/register', {
          firstName: 'Duplicate',
          lastName: 'Test',
          email: testEmail,
          password: testPassword
        })
        console.error('❌ Error: Duplicate email was not blocked!')
      } catch (dupErr) {
        console.log('[REGISTER] Duplicate response status:', dupErr.response?.status, '(Expected 409 ✅)')
        console.log('[REGISTER] Duplicate response message:', dupErr.response?.data?.message)
      }

      // Clean up
      await User.deleteOne({ _id: dbDoc._id })
      console.log('\nCleaned up test record.')

    } catch (err) {
      console.error('❌ Registration request failed:', err.response?.data || err.message)
    } finally {
      server.close()
      await mongoose.disconnect()
      console.log('\n--- REGISTER HTTP TRACE COMPLETE ---')
    }
  })
}

runRegisterHttpTrace().catch(console.error)
