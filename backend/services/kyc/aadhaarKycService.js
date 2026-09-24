/**
 * STYLE STREET — Genuine Aadhaar KYC Verification Service
 *
 * Strict Compliance:
 * - Authorised compliant provider (Cashfree / Setu / SurePass / Decentro Sub-AUA)
 * - Explicit user consent required before calling provider
 * - No fake verification; missing provider credentials strictly fails safely
 * - NEVER stores raw Aadhaar OTP or biometric data
 * - Always masks Aadhaar: XXXXXXXX1234
 */

import axios from 'axios';
import { getProviderConfig, isProductionKyc } from './kycConfig.js';
import { maskAadhaar, isValidAadhaarFormat } from '../../utils/kycMaskUtils.js';

export const CONSENT_STATEMENT = 'I consent to Aadhaar-based identity verification for seller KYC.';

/**
 * Initiates Aadhaar OTP generation via compliant provider
 * @param {Object} params
 * @param {string} params.aadhaarNumber 12-digit Aadhaar number
 * @param {boolean} params.consent User explicit consent
 * @param {string} params.userId Authenticated seller user ID
 */
export const initiateAadhaarKyc = async ({ aadhaarNumber, consent, userId }) => {
  if (!consent) {
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: `Explicit consent is required. Must accept: "${CONSENT_STATEMENT}"`
    };
  }

  if (!isValidAadhaarFormat(aadhaarNumber)) {
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: 'Invalid 12-digit Aadhaar number format.'
    };
  }

  const config = getProviderConfig('aadhaar');

  // If real provider credentials are NOT configured:
  if (!config.isConfigured) {
    return {
      success: false,
      configured: false,
      status: 'NOT_CONFIGURED',
      message: 'Aadhaar verification service is not configured on this server. Provider API credentials (AADHAAR_CLIENT_ID & AADHAAR_CLIENT_SECRET) must be set in the server environment.',
      aadhaarMasked: maskAadhaar(aadhaarNumber)
    };
  }

  // Provider Dispatch (Cashfree Verification Suite v2 or compatible provider)
  try {
    const isProd = isProductionKyc();
    const baseUrl = isProd
      ? 'https://api.cashfree.com/verification/offline-aadhaar'
      : 'https://sandbox.cashfree.com/verification/offline-aadhaar';

    const headers = {
      'Content-Type': 'application/json',
      'x-client-id': config.clientId,
      'x-client-secret': config.clientSecret
    };

    const res = await axios.post(
      `${baseUrl}/otp`,
      {
        aadhaar_number: aadhaarNumber.replace(/\D/g, '')
      },
      { headers, timeout: 15000 }
    );

    if (res.data?.status === 'SUCCESS' || res.data?.ref_id) {
      return {
        success: true,
        configured: true,
        status: 'PENDING',
        refId: res.data.ref_id,
        aadhaarMasked: maskAadhaar(aadhaarNumber),
        provider: config.provider,
        consentObtained: true,
        consentTimestamp: new Date(),
        message: 'OTP has been dispatched by the UIDAI authorized provider to your Aadhaar-linked mobile.'
      };
    }

    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: res.data?.message || 'Aadhaar verification provider could not initiate OTP. Please try again later.'
    };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: `Aadhaar provider error: ${errorMsg}`
    };
  }
};

/**
 * Submits the OTP received on Aadhaar-linked mobile to complete KYC
 * @param {Object} params
 * @param {string} params.refId Provider reference ID from initiateAadhaarKyc
 * @param {string} params.otp 6-digit OTP received by seller
 */
export const verifyAadhaarOtp = async ({ refId, otp, consent }) => {
  if (!refId || !otp || typeof otp !== 'string' || otp.trim().length !== 6) {
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: 'Valid reference ID and 6-digit OTP are required.'
    };
  }

  const config = getProviderConfig('aadhaar');

  if (!config.isConfigured) {
    return {
      success: false,
      configured: false,
      status: 'NOT_CONFIGURED',
      message: 'Aadhaar verification service is not configured on this server.'
    };
  }

  try {
    const isProd = isProductionKyc();
    const baseUrl = isProd
      ? 'https://api.cashfree.com/verification/offline-aadhaar'
      : 'https://sandbox.cashfree.com/verification/offline-aadhaar';

    const headers = {
      'Content-Type': 'application/json',
      'x-client-id': config.clientId,
      'x-client-secret': config.clientSecret
    };

    const res = await axios.post(
      `${baseUrl}/verify`,
      {
        ref_id: refId,
        otp: otp.trim()
      },
      { headers, timeout: 20000 }
    );

    if (res.data?.status === 'VALID' || res.data?.status === 'SUCCESS') {
      const data = res.data;
      return {
        success: true,
        configured: true,
        status: 'VERIFIED',
        refId,
        providerRef: data.care_of || data.reference_id || refId,
        nameOnAadhaar: data.name || '',
        gender: data.gender || '',
        dob: data.dob || '',
        aadhaarMasked: maskAadhaar(data.aadhaar_number || 'XXXXXXXX0000'),
        verifiedAt: new Date(),
        message: 'Aadhaar identity verified successfully via compliant provider.'
      };
    }

    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: res.data?.message || 'Invalid Aadhaar OTP or provider verification failed.'
    };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: `Aadhaar verification error: ${errorMsg}`
    };
  }
};

export default {
  CONSENT_STATEMENT,
  initiateAadhaarKyc,
  verifyAadhaarOtp
};
