/**
 * STYLE STREET — KYC Sensitive Data Minimization & Masking Utilities
 * 
 * Strict Compliance:
 * - Aadhaar: Masks first 8 digits -> XXXXXXXX1234
 * - PAN: Masks first 6 characters -> XXXXXX1234X
 * - Bank Account: Masks all except last 4 digits -> XXXX XXXX 4521
 * - Phone: Masks middle digits -> +91 98*****210
 */

import { maskPhoneNumber } from './phoneUtils.js';

export { maskPhoneNumber };

/**
 * Masks an Aadhaar number to display only the last 4 digits
 * e.g., "123456789012" -> "XXXXXXXX9012"
 */
export const maskAadhaar = (aadhaar) => {
  if (!aadhaar || typeof aadhaar !== 'string') return '';
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length < 4) return 'XXXXXXXX****';
  const last4 = digits.slice(-4);
  return `XXXXXXXX${last4}`;
};

/**
 * Masks a PAN number
 * e.g., "ABCDE1234F" -> "XXXXXX1234F"
 */
export const maskPan = (pan) => {
  if (!pan || typeof pan !== 'string') return '';
  const clean = pan.trim().toUpperCase();
  if (clean.length !== 10) return 'XXXXXX****';
  return `XXXXXX${clean.slice(6)}`;
};

/**
 * Masks a Bank Account number
 * e.g., "1234567890123" -> "XXXX XXXX 0123"
 */
export const maskBankAccount = (accountNumber) => {
  if (!accountNumber || typeof accountNumber !== 'string') return '';
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX XXXX ****';
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
};

/**
 * Validates PAN structure (Income Tax Dept format: 5 letters, 4 digits, 1 letter)
 */
export const isValidPanFormat = (pan) => {
  if (!pan || typeof pan !== 'string') return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
};

/**
 * Validates Indian IFSC code format
 */
export const isValidIfscFormat = (ifsc) => {
  if (!ifsc || typeof ifsc !== 'string') return false;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
};

/**
 * Validates 12-digit Aadhaar number format
 */
export const isValidAadhaarFormat = (aadhaar) => {
  if (!aadhaar || typeof aadhaar !== 'string') return false;
  const digits = aadhaar.replace(/\D/g, '');
  return digits.length === 12 && !/^[01]/.test(digits);
};
