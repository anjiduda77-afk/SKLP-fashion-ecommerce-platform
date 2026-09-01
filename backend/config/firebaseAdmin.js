import admin from 'firebase-admin'
import axios from 'axios'

const projectId = process.env.FIREBASE_PROJECT_ID || 'sklp-fashion-store-9fa5d'
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined

// Initialize Firebase Admin (Singleton safe)
if (!admin.apps.length) {
  try {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        }),
        projectId
      })
    } else {
      // Initialize with Project ID to cryptographically verify Firebase ID Tokens against Google public certificates
      admin.initializeApp({
        projectId
      })
    }
    console.log(`[FIREBASE ADMIN] Initialized with Project ID: ${projectId}`)
  } catch (initErr) {
    console.warn('[FIREBASE ADMIN] Initialization warning:', initErr.message)
  }
}

/**
 * Verifies a Firebase ID Token or Google ID Token sent from the frontend.
 * Multi-layer fallback:
 * 1. Firebase Admin SDK verifyIdToken
 * 2. Google OAuth2 tokeninfo endpoint (https://oauth2.googleapis.com/tokeninfo?id_token=...)
 * 
 * Returns standard decoded token containing uid, email, name, picture, and phone_number.
 *
 * @param {string} idToken The Firebase ID Token / Google ID Token
 * @returns {Promise<Object>}
 */
export const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase / Google authentication token is required')
  }

  // 1. Try Firebase Admin SDK verification first
  try {
    if (admin.apps.length) {
      const decoded = await admin.auth().verifyIdToken(idToken)
      if (decoded && (decoded.uid || decoded.sub || decoded.email)) {
        return {
          uid: decoded.uid || decoded.sub,
          email: decoded.email || null,
          email_verified: Boolean(decoded.email_verified),
          name: decoded.name || decoded.displayName || null,
          picture: decoded.picture || decoded.photoURL || null,
          phone_number: decoded.phone_number || decoded.phoneNumber || null,
          ...decoded
        }
      }
    }
  } catch (fbErr) {
    console.warn('[FIREBASE ADMIN] verifyIdToken note:', fbErr.message)
  }

  // 2. Fallback: Verify directly with Google OAuth2 TokenInfo API
  try {
    const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      timeout: 10000
    })

    if (googleRes.data && (googleRes.data.sub || googleRes.data.email || googleRes.data.user_id)) {
      const data = googleRes.data
      return {
        uid: data.user_id || data.sub,
        email: data.email || null,
        email_verified: data.email_verified === 'true' || data.email_verified === true,
        name: data.name || null,
        picture: data.picture || null,
        phone_number: data.phone_number || null,
        ...data
      }
    }
  } catch (tokenInfoErr) {
    console.warn('[GOOGLE TOKENINFO] Verification fallback note:', tokenInfoErr.message)
  }

  // 3. Fallback: Try Google OAuth2 userinfo if it is an access token
  try {
    const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${idToken}` },
      timeout: 10000
    })

    if (userinfoRes.data && (userinfoRes.data.sub || userinfoRes.data.email)) {
      const data = userinfoRes.data
      return {
        uid: data.sub,
        email: data.email || null,
        email_verified: Boolean(data.email_verified),
        name: data.name || (data.given_name ? `${data.given_name} ${data.family_name || ''}`.trim() : null),
        picture: data.picture || null,
        phone_number: null,
        ...data
      }
    }
  } catch (userinfoErr) {
    console.warn('[GOOGLE USERINFO] Verification fallback note:', userinfoErr.message)
  }

  throw new Error('Authentication token could not be verified by Google or Firebase')
}

export default admin
