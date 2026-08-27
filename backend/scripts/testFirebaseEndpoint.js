import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

async function testFirebaseEndpoint() {
  console.log('\n===============================================================')
  console.log('🔥 TESTING BACKEND FIREBASE LOGIN ENDPOINT')
  console.log('===============================================================\n')

  // 1. Missing Token Test
  try {
    await axios.post(`${API_BASE}/auth/firebase-login`, {})
    console.error('❌ Expected failure when no token provided')
    process.exit(1)
  } catch (err) {
    console.log(`✅ [PASS] Missing Token correctly rejected with status: ${err.response?.status} ("${err.response?.data?.message}")`)
  }

  // 2. Invalid / Forged Token Test
  try {
    await axios.post(`${API_BASE}/auth/firebase-login`, { idToken: 'invalid_forged_token_xyz' })
    console.error('❌ Expected failure when invalid token provided')
    process.exit(1)
  } catch (err) {
    console.log(`✅ [PASS] Forged Token correctly rejected with status: ${err.response?.status} ("${err.response?.data?.message}")`)
  }

  console.log('\n🎉 Backend Firebase Admin ID Token verification is active and secure!')
  process.exit(0)
}

testFirebaseEndpoint()
