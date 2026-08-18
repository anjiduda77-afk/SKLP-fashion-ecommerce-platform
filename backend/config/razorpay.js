import Razorpay from 'razorpay'

export const isRazorpayConfigured = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes('placeholder') &&
    !keySecret.includes('placeholder') &&
    (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_'))
  )
}

export const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder'
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder'

  return new Razorpay({
    key_id,
    key_secret
  })
}

export const razorpayInstance = getRazorpayInstance()

export default razorpayInstance
