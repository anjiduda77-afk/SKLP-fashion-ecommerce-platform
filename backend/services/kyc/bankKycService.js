/**
 * STYLE STREET — Genuine Bank Account KYC Verification Service
 *
 * Strict Compliance:
 * - Do NOT verify bank account merely because format is correct
 * - Do NOT simulate fake penny drop
 * - Call genuine authorised bank verification provider (Cashfree / RazorpayX / Setu / Decentro)
 * - If provider credentials missing, fail safely with NOT_CONFIGURED
 * - Masks bank account number: XXXX XXXX 4521
 */

import axios from 'axios';
import { getProviderConfig, isProductionKyc } from './kycConfig.js';
import { maskBankAccount, isValidIfscFormat } from '../../utils/kycMaskUtils.js';
import { evaluateIdentityConsistency } from './nameMatchingService.js';

/**
 * Verifies a seller's bank account with NPCI / Banking network via authorized provider
 * @param {Object} params
 * @param {string} params.accountNumber Bank account number (9 to 18 digits)
 * @param {string} params.ifscCode 11-character Indian IFSC code
 * @param {string} params.accountHolderName Expected account holder name
 * @param {string} [params.panName] Optional name on PAN for cross-verification
 * @returns {Promise<Object>} Verification result
 */
export const verifyBankAccountWithProvider = async ({
  accountNumber,
  ifscCode,
  accountHolderName,
  panName
}) => {
  const cleanAccount = (accountNumber || '').replace(/\D/g, '');
  const cleanIfsc = (ifscCode || '').trim().toUpperCase();

  if (!cleanAccount || cleanAccount.length < 9 || cleanAccount.length > 18) {
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: 'Invalid bank account number. Indian bank accounts must contain 9 to 18 digits.'
    };
  }

  if (!isValidIfscFormat(cleanIfsc)) {
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      message: 'Invalid IFSC code format (e.g. HDFC0001234, SBIN0000456).'
    };
  }

  const config = getProviderConfig('bank');

  // Strict Rule: If provider credentials are NOT configured, do NOT fake verification
  if (!config.isConfigured) {
    return {
      success: false,
      configured: false,
      status: 'NOT_CONFIGURED',
      accountMasked: maskBankAccount(cleanAccount),
      ifscCode: cleanIfsc,
      message: 'Bank account verification service is not configured on this server. Provider API credentials (BANK_CLIENT_ID & BANK_CLIENT_SECRET) must be set in the server environment.'
    };
  }

  try {
    const isProd = isProductionKyc();
    const baseUrl = isProd
      ? 'https://api.cashfree.com/verification/bank-account/sync'
      : 'https://sandbox.cashfree.com/verification/bank-account/sync';

    const headers = {
      'Content-Type': 'application/json',
      'x-client-id': config.clientId,
      'x-client-secret': config.clientSecret
    };

    const res = await axios.post(
      baseUrl,
      {
        bank_account: cleanAccount,
        ifsc: cleanIfsc,
        name: accountHolderName || undefined
      },
      { headers, timeout: 20000 }
    );

    const data = res.data;
    const isValid = data?.account_status === 'VALID' || data?.status === 'SUCCESS';

    if (isValid) {
      const verifiedName = data.name_at_bank || data.beneficiary_name || '';
      const bankName = data.bank_name || '';

      const matchResult = evaluateIdentityConsistency({
        applicantName: accountHolderName,
        panName,
        bankAccountName: verifiedName
      });

      const isMismatch = matchResult.status === 'MISMATCH';

      return {
        success: !isMismatch,
        configured: true,
        status: isMismatch ? 'NEEDS_REVIEW' : 'VERIFIED',
        accountMasked: maskBankAccount(cleanAccount),
        ifscCode: cleanIfsc,
        bankName,
        beneficiaryName: verifiedName,
        provider: config.provider,
        providerRef: data.reference_id || data.utr || `BANK_${Date.now()}`,
        nameMatch: matchResult,
        verifiedAt: new Date(),
        message: isMismatch
          ? 'Bank account is active, but the registered account holder name does not match the applicant record. Sent for compliance review.'
          : 'Bank account verified successfully with the banking network.'
      };
    }

    return {
      success: false,
      configured: true,
      status: 'FAILED',
      accountMasked: maskBankAccount(cleanAccount),
      ifscCode: cleanIfsc,
      message: data?.message || 'Bank account could not be verified by the banking network. Please check the account number and IFSC.'
    };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    return {
      success: false,
      configured: true,
      status: 'FAILED',
      accountMasked: maskBankAccount(cleanAccount),
      ifscCode: cleanIfsc,
      message: `Bank verification provider error: ${errorMsg}`
    };
  }
};

export default {
  verifyBankAccountWithProvider
};
