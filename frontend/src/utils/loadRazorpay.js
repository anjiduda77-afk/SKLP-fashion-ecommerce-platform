/**
 * Dynamically loads the official Razorpay Checkout SDK script
 * Returns a Promise that resolves to boolean (true if loaded, false on error)
 */
let razorpayLoadPromise = null

export const loadRazorpayScript = () => {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)

  if (razorpayLoadPromise) {
    return razorpayLoadPromise
  }

  razorpayLoadPromise = new Promise((resolve) => {
    // Check if script tag already exists in DOM
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true))
      existingScript.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      resolve(true)
    }

    script.onerror = () => {
      console.warn('Failed to load Razorpay Checkout SDK script.')
      razorpayLoadPromise = null
      resolve(false)
    }

    document.body.appendChild(script)
  })

  return razorpayLoadPromise
}

export default loadRazorpayScript
