import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult 
} from 'firebase/auth'
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported as isMessagingSupported 
} from 'firebase/messaging'

// Firebase Web Configuration — loaded from environment variables (VITE_FIREBASE_*)
// with defaults for project 'sklp-fashion-store-9fa5d'
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
let messaging = null

if (FIREBASE_CONFIGURED) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    googleProvider = new GoogleAuthProvider()
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    })
  } catch (err) {
    app = null
    auth = null
    googleProvider = null
  }
}

/**
 * Initialize Web Push safely (only in supporting browser environments)
 */
export const getFirebaseMessaging = async () => {
  if (!app) return null
  if (messaging) return messaging

  try {
    const supported = await isMessagingSupported()
    if (supported && typeof window !== 'undefined' && 'Notification' in window) {
      messaging = getMessaging(app)
      return messaging
    }
  } catch (err) {
    // messaging unavailable in current client environment
  }
  return null
}

/**
 * Request Notification Permission and return Device Token
 * @param {string} vapidKey Optional VAPID key
 * @returns {Promise<string|null>}
 */
export const requestFcmToken = async (vapidKey) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return null
    }

    const msgInstance = await getFirebaseMessaging()
    if (!msgInstance) {
      return null
    }

    // Try service worker registration
    let swRegistration = null
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      } catch (swErr) {
        // service worker registration handled gracefully
      }
    }

    const tokenOptions = {
      ...(vapidKey ? { vapidKey } : {}),
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {})
    }

    const currentToken = await getToken(msgInstance, tokenOptions)
    if (currentToken) {
      return currentToken
    } else {
      return null
    }
  } catch (err) {
    return null
  }
}

/**
 * Listen for foreground push messages
 * @param {Function} callback Callback receiving the notification payload
 * @returns {Function|null} Unsubscribe function
 */
export const onForegroundMessage = (callback) => {
  if (!callback || typeof window === 'undefined') return () => {}

  let unsubscribe = () => {}
  getFirebaseMessaging().then((msg) => {
    if (msg) {
      unsubscribe = onMessage(msg, (payload) => {
        callback(payload)
      })
    }
  }).catch((err) => {
    // foreground listener catch
  })

  return () => unsubscribe()
}

export { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  FIREBASE_CONFIGURED, 
  firebaseConfig 
}
export default app
