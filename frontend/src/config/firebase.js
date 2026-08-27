import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth'

// Firebase Web Configuration — loaded from environment variables (VITE_FIREBASE_*)
// In Vercel: add these in Project → Settings → Environment Variables
// In local dev: add these in frontend/.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Validate that Firebase env vars are set — if missing, disable Firebase gracefully
// DO NOT throw here — a module-level throw causes a blank white screen
const FIREBASE_CONFIGURED = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

if (!FIREBASE_CONFIGURED) {
  console.warn(
    '[SKLP Firebase] Firebase environment variables are not configured.\n' +
    'Phone authentication will be unavailable.\n' +
    'Add VITE_FIREBASE_* variables to your Vercel project environment settings\n' +
    'and redeploy, or to frontend/.env for local development.'
  )
}

// Initialize Firebase App only when fully configured (Singleton safe)
let app = null
let auth = null

if (FIREBASE_CONFIGURED) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
  } catch (err) {
    console.error('[SKLP Firebase] Initialization error:', err.message)
    app = null
    auth = null
  }
}

export { auth, RecaptchaVerifier, signInWithPhoneNumber, FIREBASE_CONFIGURED }
export default app
