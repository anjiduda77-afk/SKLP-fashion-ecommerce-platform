import admin from 'firebase-admin'
import axios from 'axios'
import jwt from 'jsonwebtoken'

const projectId = process.env.FIREBASE_PROJECT_ID || 'sklp-fashion-store-9fa5d'
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY
const privateKey = rawPrivateKey
  ? rawPrivateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').replace(/\r/g, '').trim()
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
      console.log(`[FIREBASE ADMIN] Initialized with Service Account: ${clientEmail}`)
    } else {
      // Initialize with Project ID to cryptographically verify Firebase ID Tokens against Google public certificates
      admin.initializeApp({
        projectId
      })
      console.log(`[FIREBASE ADMIN] Initialized with Project ID: ${projectId}`)
    }
  } catch (initErr) {
    console.warn('[FIREBASE ADMIN] Initialization warning:', initErr.message)
  }
}

// In-memory cache for Google's public x509 certificates used to verify Firebase ID Tokens
let cachedFirebaseCerts = null
let certsExpiry = 0

async function getFirebasePublicCertificates() {
  const now = Date.now()
  if (cachedFirebaseCerts && now < certsExpiry) {
    return cachedFirebaseCerts
  }
  try {
    const res = await axios.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {
      timeout: 8000
    })
    if (res.data && typeof res.data === 'object') {
      cachedFirebaseCerts = res.data
      certsExpiry = now + 4 * 60 * 60 * 1000 // Cache for 4 hours
      return cachedFirebaseCerts
    }
  } catch (err) {
    console.warn('[FIREBASE CERTS] Error fetching public certs:', err.message)
  }
  return cachedFirebaseCerts || {}
}

/**
 * Verifies a Firebase ID Token or Google ID Token sent from the frontend.
 * Multi-layer fallback:
 * 1. Direct Cryptographic Verification via Google's official public x509 certs (RS256)
 * 2. Firebase Admin SDK verifyIdToken (when service account credentials are provided)
 * 3. Google OAuth2 tokeninfo endpoint (https://oauth2.googleapis.com/tokeninfo?id_token=...)
 * 4. Google OAuth2 userinfo endpoint (https://www.googleapis.com/oauth2/v3/userinfo)
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

  // Dev / Testing bypass for simulated test tokens in non-production
  if (process.env.NODE_ENV !== 'production' && typeof idToken === 'string' && idToken.includes('test_firebase_token_')) {
    const emailMatch = idToken.match(/test_firebase_token_[:|]([^:|]+)[:|]([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+?)(?:\.|$)/)
    if (emailMatch) {
      return {
        uid: emailMatch[1],
        email: emailMatch[2],
        email_verified: true,
        name: 'Firebase Test User',
        picture: 'https://lh3.googleusercontent.com/a/test-avatar',
        phone_number: null
      }
    }
    const generalMatch = idToken.match(/test_firebase_token_[:|]([^:|]+)(?:[:|]([^:|.]+))?/)
    if (generalMatch) {
      return {
        uid: generalMatch[1],
        email: generalMatch[2]?.includes('@') ? generalMatch[2] : null,
        email_verified: true,
        name: 'Firebase Test User',
        picture: 'https://lh3.googleusercontent.com/a/test-avatar',
        phone_number: generalMatch[2]?.startsWith('+') ? generalMatch[2] : null
      }
    }
    return {
      uid: 'test_fb_uid_' + Date.now(),
      email: 'test_fb_user@gmail.com',
      email_verified: true,
      name: 'Firebase Test User',
      picture: 'https://lh3.googleusercontent.com/a/test-avatar',
      phone_number: null
    }
  }

  // 1. Direct Cryptographic Verification with Google Public Certificates
  try {
    const unverified = jwt.decode(idToken, { complete: true })
    if (unverified?.header?.kid) {
      const kid = unverified.header.kid
      const certs = await getFirebasePublicCertificates()
      const cert = certs[kid]
      if (cert) {
        const decoded = jwt.verify(idToken, cert, {
          algorithms: ['RS256'],
          issuer: `https://securetoken.google.com/${projectId}`,
          audience: projectId
        })
        if (decoded && (decoded.user_id || decoded.sub || decoded.uid)) {
          return {
            uid: decoded.user_id || decoded.sub || decoded.uid,
            email: decoded.email || null,
            email_verified: Boolean(decoded.email_verified),
            name: decoded.name || null,
            picture: decoded.picture || null,
            phone_number: decoded.phone_number || null,
            ...decoded
          }
        }
      }
    }
  } catch (certVerifyErr) {
    console.warn('[FIREBASE PUBLIC CERT] Verification note:', certVerifyErr.message)
  }

  // 2. Try Firebase Admin SDK verification (if initialized with service account)
  try {
    if (admin.apps.length && clientEmail && privateKey) {
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

  // 3. Fallback: Verify directly with Google OAuth2 TokenInfo API (for Google OAuth ID Tokens)
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

  // 4. Fallback: Try Google OAuth2 userinfo if it is an access token
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

  // 5. Non-production fallback: inspect decoded token if payload contains valid email & uid
  if (process.env.NODE_ENV !== 'production') {
    try {
      const unverified = jwt.decode(idToken)
      if (unverified && (unverified.email || unverified.sub || unverified.user_id)) {
        return {
          uid: unverified.user_id || unverified.sub || unverified.uid || `goog_${Date.now()}`,
          email: unverified.email || null,
          email_verified: true,
          name: unverified.name || 'Google User',
          picture: unverified.picture || null,
          phone_number: unverified.phone_number || null,
          ...unverified
        }
      }
    } catch (unverifiedErr) {
      // ignore
    }
  }

  throw new Error('Authentication token could not be verified by Google or Firebase')
}

/**
 * Send FCM push notification to one or multiple device tokens
 * @param {Object} options
 * @param {string|string[]} options.tokens Single or array of FCM registration tokens
 * @param {string} options.title Notification title
 * @param {string} options.body Notification body text
 * @param {string} [options.imageUrl] Optional banner/product image
 * @param {Object} [options.data] Key-value custom payload (e.g. actionUrl, orderId)
 * @returns {Promise<Object>} Summary of success/failure
 */
export const sendPushNotification = async ({ tokens, title, body, imageUrl, data = {} }) => {
  if (!tokens || (Array.isArray(tokens) && tokens.length === 0)) {
    return { success: false, reason: 'No device tokens provided' }
  }

  const tokenList = Array.isArray(tokens) ? tokens : [tokens]
  const validTokens = tokenList.filter(t => typeof t === 'string' && t.trim().length > 10)

  if (validTokens.length === 0) {
    return { success: false, reason: 'No valid device tokens' }
  }

  if (!admin.apps.length) {
    console.warn('[FCM PUSH] Firebase Admin not initialized, push notification skipped')
    return { success: false, reason: 'Firebase Admin not initialized' }
  }

  try {
    const stringData = {}
    for (const [k, v] of Object.entries(data)) {
      stringData[k] = typeof v === 'string' ? v : JSON.stringify(v)
    }

    if (validTokens.length === 1) {
      const message = {
        token: validTokens[0],
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {})
        },
        data: stringData,
        webpush: {
          fcmOptions: {
            link: stringData.actionUrl || stringData.url || '/'
          }
        }
      }
      const response = await admin.messaging().send(message)
      console.log(`[FCM PUSH] Message sent successfully to single token: ${response}`)
      return { success: true, messageId: response }
    } else {
      const message = {
        tokens: validTokens,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {})
        },
        data: stringData,
        webpush: {
          fcmOptions: {
            link: stringData.actionUrl || stringData.url || '/'
          }
        }
      }
      const response = await admin.messaging().sendEachForMulticast(message)
      console.log(`[FCM PUSH] Multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed`)
      return { 
        success: response.successCount > 0, 
        successCount: response.successCount, 
        failureCount: response.failureCount 
      }
    }
  } catch (err) {
    console.warn('[FCM PUSH] Push notification send error:', err.message)
    return { success: false, error: err.message }
  }
}

export default admin

