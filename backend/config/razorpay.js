import Razorpay from 'razorpay'

const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder'
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder'

export const razorpayInstance = new Razorpay({
  key_id,
  key_secret
})

export const isRazorpayConfigured = () => {
  return (
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes('placeholder')
  )
}

export default razorpayInstance
