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


  // Admin Compliance Dossier
  getAdminApplicationKyc: (applicationId) =>
    apiClient.get(`/admin/seller-applications/${applicationId}/kyc`),

  reviewKycByAdmin: (applicationId, decision, notes) =>
    apiClient.put(`/admin/seller-applications/${applicationId}/kyc/review`, { decision, notes })
};

export default kycService;
