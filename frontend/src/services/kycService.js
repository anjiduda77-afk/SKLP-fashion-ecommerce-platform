/**
 * STYLE STREET — Seller KYC API Service
 *
 * Communicates with secure backend KYC verification endpoints.
 * Never stores secrets or makes client-side verification decisions.
 */

import apiClient from './apiClient';

export const kycService = {
  // Retrieve authenticated applicant's KYC status and provider availability
  getMyKycStatus: () => apiClient.get('/seller/kyc/status'),

  // Phone Verification via real Firebase ID token
  verifyPhone: (idToken, phoneNumber) =>
    apiClient.post('/seller/kyc/phone/verify', { idToken, phoneNumber }),

  // Aadhaar KYC flow via compliant provider
  startAadhaar: (aadhaarNumber, consent) =>
    apiClient.post('/seller/kyc/aadhaar/start', { aadhaarNumber, consent }),

  verifyAadhaarOtp: (refId, otp, consent) =>
    apiClient.post('/seller/kyc/aadhaar/verify', { refId, otp, consent }),

  // PAN Verification via real provider
  verifyPan: (panNumber, applicantName, dob) =>
    apiClient.post('/seller/kyc/pan/verify', { panNumber, applicantName, dob }),

  // Bank Account Verification via real provider
  verifyBank: (accountNumber, ifscCode, accountHolderName) =>
    apiClient.post('/seller/kyc/bank/verify', { accountNumber, ifscCode, accountHolderName }),

  // Admin Compliance Dossier
  getAdminApplicationKyc: (applicationId) =>
    apiClient.get(`/admin/seller-applications/${applicationId}/kyc`),

  reviewKycByAdmin: (applicationId, decision, notes) =>
    apiClient.put(`/admin/seller-applications/${applicationId}/kyc/review`, { decision, notes })
};

export default kycService;
