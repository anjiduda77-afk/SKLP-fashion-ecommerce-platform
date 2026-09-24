/**
 * STYLE STREET — Phone KYC Verification Service
 *
 * Real Verification Provider:
 * - Uses existing Firebase Phone Authentication & real SMS OTP
 * - Never stores raw OTP or temporary verification secrets
 * - Validates cryptographic Firebase ID Token issued upon verified SMS OTP
 * - Masks phone number for sensitive data minimization
 */

import { verifyFirebaseIdToken } from '../../config/firebaseAdmin.js';
import { maskPhoneNumber } from '../../utils/kycMaskUtils.js';

/**
 * Normalizes phone to E.164 (+91XXXXXXXXXX)
 */
export const normalizeIndianPhone = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (rawPhone.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
};

/**
 * Verifies a seller's phone via Firebase ID Token
 * @param {Object} params
 * @param {string} params.idToken Firebase ID token obtained after reCAPTCHA + SMS OTP
 * @param {string} params.phoneNumber Expected seller phone number
 * @returns {Promise<Object>} Verification result
 */
export const verifyPhoneWithFirebase = async ({ idToken, phoneNumber }) => {
  if (!idToken || typeof idToken !== 'string') {
    return {
      success: false,
      status: 'FAILED',
      message: 'Firebase authentication ID token is required. Please complete SMS OTP verification.'
    };
  }

  const expectedE164 = normalizeIndianPhone(phoneNumber);
  if (!expectedE164) {
    return {
      success: false,
      status: 'FAILED',
      message: 'Invalid 10-digit Indian phone number format.'
    };
  }

  try {
    // Cryptographically verify token with Google / Firebase certs
    const decoded = await verifyFirebaseIdToken(idToken);

    const tokenPhone = decoded.phone_number || decoded.phoneNumber;
    if (!tokenPhone) {
      return {
        success: false,
        status: 'FAILED',
        message: 'The provided authentication token does not contain a verified mobile number.'
      };
    }

    const decodedE164 = normalizeIndianPhone(tokenPhone);
    if (decodedE164 !== expectedE164) {
      return {
        success: false,
        status: 'FAILED',
        message: `Phone number mismatch. Token verified ${maskPhoneNumber(decodedE164)} but requested ${maskPhoneNumber(expectedE164)}.`
      };
    }

    return {
      success: true,
      status: 'VERIFIED',
      provider: 'firebase',
      firebaseUid: decoded.uid,
      phoneE164: decodedE164,
      phoneMasked: maskPhoneNumber(decodedE164),
      verifiedAt: new Date(),
      message: 'Mobile number successfully verified via Firebase SMS OTP.'
    };
  } catch (err) {
    return {
      success: false,
      status: 'FAILED',
      message: err.message || 'Firebase phone verification failed. Token may be expired or invalid.'
    };
  }
};

export default {
  verifyPhoneWithFirebase,
  normalizeIndianPhone
};
