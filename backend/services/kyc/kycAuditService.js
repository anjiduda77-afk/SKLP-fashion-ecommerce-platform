/**
 * STYLE STREET — KYC Immutable Audit Logging Service
 *
 * Records compliance events for seller verification without exposing sensitive secrets.
 */

export const AUDIT_EVENTS = {
  KYC_STARTED: 'KYC_STARTED',
  PHONE_VERIFIED: 'PHONE_VERIFIED',
  AADHAAR_VERIFICATION_STARTED: 'AADHAAR_VERIFICATION_STARTED',
  AADHAAR_VERIFIED: 'AADHAAR_VERIFIED',
  PAN_VERIFIED: 'PAN_VERIFIED',
  BANK_VERIFIED: 'BANK_VERIFIED',
  KYC_FAILED: 'KYC_FAILED',
  KYC_NEEDS_REVIEW: 'KYC_NEEDS_REVIEW',
  ADMIN_KYC_REVIEWED: 'ADMIN_KYC_REVIEWED',
  SELLER_APPROVED: 'SELLER_APPROVED',
  SELLER_REJECTED: 'SELLER_REJECTED'
};

/**
 * Creates a clean audit log entry stripped of any sensitive credentials
 * @param {Object} params
 * @param {string} params.event Audit event type from AUDIT_EVENTS
 * @param {Object} params.actor { userId, role }
 * @param {string} [params.verificationRef] Provider or transaction reference
 * @param {string} params.status Status after event
 * @param {Object} [params.details] Safe non-sensitive details
 * @returns {Object} Clean audit log entry
 */
export const createAuditEntry = ({ event, actor, verificationRef, status, details = {} }) => {
  // Strip any accidental sensitive data
  const safeDetails = { ...details };
  delete safeDetails.otp;
  delete safeDetails.password;
  delete safeDetails.clientSecret;
  delete safeDetails.apiKey;
  delete safeDetails.fullAadhaar;
  delete safeDetails.fullPan;
  delete safeDetails.fullBankAccount;

  return {
    event,
    actor: {
      userId: actor?.userId || null,
      role: actor?.role || 'system'
    },
    verificationRef: verificationRef || null,
    status: status || 'RECORDED',
    details: safeDetails,
    timestamp: new Date()
  };
};

export default {
  AUDIT_EVENTS,
  createAuditEntry
};
