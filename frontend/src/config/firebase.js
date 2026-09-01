import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth'

// Firebase Web Configuration — loaded from environment variables (VITE_FIREBASE_*)
// with fallbacks for project 'sklp-fashion-store-9fa5d'
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDdfGd-OLpeZhRCm8uBlY9-xf_se_a8zUI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sklp-fashion-store-9fa5d.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sklp-fashion-store-9fa5d',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sklp-fashion-store-9fa5d.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '92351616723',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:92351616723:web:fc67b10a1db3ecd9e8a626',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-5TXFQFW8E8'
}

// Validate that Firebase configuration is set
const FIREBASE_CONFIGURED = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

// Initialize Firebase App (Singleton safe across re-renders and HMR)
let app = null
let auth = null
let googleProvider = null

if (FIREBASE_CONFIGURED) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    googleProvider = new GoogleAuthProvider()
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    })
  } catch (err) {
    console.error('[SKLP Firebase] Initialization error:', err.message)
    app = null
    auth = null
    googleProvider = null
  }
}

export { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FIREBASE_CONFIGURED, 
  firebaseConfig 
}
export default app
