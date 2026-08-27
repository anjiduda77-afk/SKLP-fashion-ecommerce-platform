import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

async function testSendOtpFailure() {
  console.log('\n===============================================================')
  console.log('🧪 TESTING SEND-OTP BEHAVIOR WITHOUT SMS GATEWAY CREDENTIALS')
  console.log('===============================================================\n')

  try {
    const res = await axios.post(`${API_BASE}/auth/send-otp`, {
      phone: '6301568113'
    })
    console.error('❌ Expected failure when no SMS credentials configured, but got status:', res.status)
    process.exit(1)
  } catch (err) {
    const status = err.response?.status
    const data = err.response?.data
    console.log(`✅ [PASS] HTTP Status: ${status}`)
    console.log(`✅ [PASS] Error Message: "${data?.message}"`)
    console.log(`✅ [PASS] devOtp in response: ${data?.devOtp !== undefined ? 'YES (FAIL)' : 'NONE (PASS)'}`)
    console.log(`✅ [PASS] otp in response: ${data?.otp !== undefined ? 'YES (FAIL)' : 'NONE (PASS)'}`)

    if (data?.devOtp || data?.otp) {
      console.error('❌ OTP value exposed in response!')
      process.exit(1)
    }

    if (status === 503 || status === 500) {
      console.log('\n🎉 Verified: Backend rejects unconfigured SMS gateway without faking success!')
      process.exit(0)
    } else {
      console.error('❌ Unexpected status code:', status)
      process.exit(1)
    }
  }
}

testSendOtpFailure()
