import admin from 'firebase-admin'

const projectId = process.env.FIREBASE_PROJECT_ID || 'sklp-fashion-store-9fa5d'
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined

// Initialize Firebase Admin (Singleton safe)
if (!admin.apps.length) {
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
}

/**
 * Verifies a Firebase ID Token sent from the frontend.
 * Returns the decoded token containing uid and verified phone_number.
 *
 * @param {string} idToken The Firebase ID Token (JWT)
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
export const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID Token is required')
  }
  return await admin.auth().verifyIdToken(idToken)
}

export default admin
