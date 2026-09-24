/**
 * STYLE STREET — Genuine PAN Verification Service
 *
 * Strict Compliance:
 * - Do NOT validate PAN using regex alone
 * - Must call genuine authorised PAN verification provider (Cashfree / Setu / SurePass / Karza)
 * - If provider credentials missing, fail safely with NOT_CONFIGURED
 * - Never expose provider credentials to frontend
 * - Masks PAN: XXXXXX1234X
 */

import axios from 'axios';
import { getProviderConfig, isProductionKyc } from './kycConfig.js';
import { maskPan, isValidPanFormat } from '../../utils/kycMaskUtils.js';
import { evaluateIdentityConsistency } from './nameMatchingService.js';

/**
 * Verifies a seller PAN via authorised provider API
 * @param {Object} params
 * @param {string} params.panNumber 10-character PAN number
 * @param {string} params.applicantName Legal applicant / shop owner name
 * @param {string} [params.dob] Optional date of birth (YYYY-MM-DD)
 * @returns {Promise<Object>} Verification result
 */
export const verifyPanWithProvider = async ({ panNumber, applicantName, dob }) => {
  const cleanPan = (panNumber || '').trim().toUpperCase();

  // Basic syntax check prior to network call
  if (!isValidPanFormat(cleanPan)) {
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: 'Invalid PAN format. PAN must be exactly 10 alphanumeric characters (e.g. ABCDE1234F).'
    };
  }

  const config = getProviderConfig('pan');

  // Strict Rule: If provider credentials are NOT configured, do NOT verify with regex alone
  if (!config.isConfigured) {
    return {
      success: false,
      configured: false,
      status: 'NOT_CONFIGURED',
      panMasked: maskPan(cleanPan),
      message: 'PAN verification service is not configured on this server. Provider API credentials (PAN_CLIENT_ID & PAN_CLIENT_SECRET) must be set in the server environment.'
    };
  }

  try {
    const isProd = isProductionKyc();
    const baseUrl = isProd
      ? 'https://api.cashfree.com/verification/pan'
      : 'https://sandbox.cashfree.com/verification/pan';

    const headers = {
      'Content-Type': 'application/json',
      'x-client-id': config.clientId,
      'x-client-secret': config.clientSecret
    };

    const res = await axios.post(
      baseUrl,
      {
        pan: cleanPan,
        name: applicantName || undefined,
        dob: dob || undefined
      },
      { headers, timeout: 15000 }
    );

    const data = res.data;
    const isValid = data?.valid === true || data?.status === 'VALID' || data?.pan_status === 'VALID';

    if (isValid) {
      const nameOnPan = data.registered_name || data.name || data.name_on_pan || '';
      const matchResult = evaluateIdentityConsistency({
        applicantName,
        panName: nameOnPan
      });

      const isMismatch = matchResult.status === 'MISMATCH';

      return {
        success: !isMismatch,
        configured: true,
        status: isMismatch ? 'NEEDS_REVIEW' : 'VERIFIED',
        panMasked: maskPan(cleanPan),
        nameOnPan,
        provider: config.provider,
        providerRef: data.reference_id || `PAN_${Date.now()}`,
        nameMatch: matchResult,
        verifiedAt: new Date(),
        message: isMismatch
          ? 'PAN is valid, but the name registered with the Income Tax Department does not match applicant records. Sent for compliance review.'
          : 'PAN successfully verified with Income Tax Department records.'
      };
    }

    return {
      success: false,
      configured: true,
      status: 'FAILED',
      panMasked: maskPan(cleanPan),
      message: data?.message || 'PAN number is not active or could not be found in Income Tax records.'
    };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      panMasked: maskPan(cleanPan),
      message: `PAN provider error: ${errorMsg}`
    };
  }
};

export default {
  verifyPanWithProvider
};
