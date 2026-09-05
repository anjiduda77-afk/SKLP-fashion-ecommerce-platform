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
    console.error('[SKLP Firebase] Auth initialization error:', err.message)
    app = null
    auth = null
    googleProvider = null
  }
}

/**
 * Initialize Firebase Cloud Messaging safely (only in supporting browser environments)
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
    console.warn('[SKLP Firebase] Messaging not supported in this environment:', err.message)
  }
  return null
}

/**
 * Request Notification Permission and return FCM Device Token
 * @param {string} vapidKey Optional VAPID key (public key pair from Firebase Console)
 * @returns {Promise<string|null>}
 */
export const requestFcmToken = async (vapidKey) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[SKLP FCM] Notification permission not granted:', permission)
      return null
    }

    const msgInstance = await getFirebaseMessaging()
    if (!msgInstance) {
      console.warn('[SKLP FCM] Messaging instance could not be initialized')
      return null
    }

    // Try service worker registration
    let swRegistration = null
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      } catch (swErr) {
        console.warn('[SKLP FCM] SW registration note:', swErr.message)
      }
    }

    const tokenOptions = {
      ...(vapidKey ? { vapidKey } : {}),
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {})
    }

    const currentToken = await getToken(msgInstance, tokenOptions)
    if (currentToken) {
      console.log('[SKLP FCM] Device token obtained successfully')
      return currentToken
    } else {
      console.warn('[SKLP FCM] No registration token available')
      return null
    }
  } catch (err) {
    console.warn('[SKLP FCM] Error retrieving device token:', err.message)
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
        console.log('[SKLP FCM] Foreground notification received:', payload)
        callback(payload)
      })
    }
  }).catch((err) => {
    console.warn('[SKLP FCM] Foreground listener note:', err.message)
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
