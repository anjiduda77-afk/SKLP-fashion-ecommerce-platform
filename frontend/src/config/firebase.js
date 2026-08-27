import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth'

// Firebase Web Configuration — loaded from frontend/.env (VITE_FIREBASE_*)
// Never hardcode secrets. All values come from environment variables only.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase App (Singleton safe — prevents double-init in React StrictMode)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

// Initialize Firebase Authentication only (no Analytics, no Firestore, no Storage)
export const auth = getAuth(app)

export { RecaptchaVerifier, signInWithPhoneNumber }
export default app
