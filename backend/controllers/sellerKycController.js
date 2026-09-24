/**
 * STYLE STREET — Seller KYC Controller
 *
 * Strict Compliance:
 * - Server-authoritative state transitions only
 * - NEVER marks any item VERIFIED without genuine provider response
 * - Safe fallback to NOT_CONFIGURED when provider credentials are missing
 * - Strict RBAC: Seller can only access own KYC, Admin reviews
 * - Minimizes sensitive data and returns only masked representations
 */

import SellerKYC from '../models/SellerKYC.js';
import SellerApplication from '../models/SellerApplication.js';
import User from '../models/User.js';
import { getKycConfigurationStatus } from '../services/kyc/kycConfig.js';
import { verifyPhoneWithFirebase } from '../services/kyc/phoneKycService.js';
import { initiateAadhaarKyc, verifyAadhaarOtp } from '../services/kyc/aadhaarKycService.js';
import { verifyPanWithProvider } from '../services/kyc/panKycService.js';
import { verifyBankAccountWithProvider } from '../services/kyc/bankKycService.js';
import { evaluateIdentityConsistency } from '../services/kyc/nameMatchingService.js';
import { createAuditEntry, AUDIT_EVENTS } from '../services/kyc/kycAuditService.js';
import ApiError from '../utils/ApiError.js';

/**
 * Helper to retrieve or create the authenticated user's SellerKYC record
 */
const getOrCreateSellerKyc = async (userId) => {
  let kyc = await SellerKYC.findOne({ userId });
  const user = await User.findById(userId);

  if (!kyc) {
    const application = await SellerApplication.findOne({ userId }).sort({ createdAt: -1 });
    const applicantName = application?.applicantName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Merchant Applicant';

    kyc = new SellerKYC({
      userId,
      applicationId: application?._id || null,
      applicantName,
      overallStatus: 'NOT_STARTED',
      auditLogs: [
        createAuditEntry({
          event: AUDIT_EVENTS.KYC_STARTED,
          actor: { userId, role: user?.role || 'customer' },
          status: 'NOT_STARTED',
          details: { message: 'Seller KYC profile initialized' }
        })
      ]
    });
    await kyc.save();

    if (application) {
      application.kyc = kyc._id;
      application.kycStatus = kyc.overallStatus;
      await application.save();
    }
  }

  return kyc;
};

/**
 * GET /api/seller/kyc/status
 * Retrieves authenticated seller's current KYC progress, masked details, and provider status
 */
export const getMyKycStatus = async (req, res) => {
  const userId = req.user.id;
  const kyc = await getOrCreateSellerKyc(userId);
  const configStatus = getKycConfigurationStatus();

  res.status(200).json({
    success: true,
    kyc: {
      id: kyc._id,
      applicantName: kyc.applicantName,
      overallStatus: kyc.overallStatus,
      phone: {
        status: kyc.phone?.status || 'PENDING',
        phoneMasked: kyc.phone?.phoneMasked || '',
        verifiedAt: kyc.phone?.verifiedAt || null
      },
      aadhaar: {
        status: kyc.aadhaar?.status || 'PENDING',
        aadhaarMasked: kyc.aadhaar?.aadhaarMasked || '',
        nameOnAadhaar: kyc.aadhaar?.nameOnAadhaar || '',
        verifiedAt: kyc.aadhaar?.verifiedAt || null,
        refId: kyc.aadhaar?.refId || null
      },
      pan: {
        status: kyc.pan?.status || 'PENDING',
        panMasked: kyc.pan?.panMasked || '',
        nameOnPan: kyc.pan?.nameOnPan || '',
        verifiedAt: kyc.pan?.verifiedAt || null
      },
      bank: {
        status: kyc.bank?.status || 'PENDING',
        accountMasked: kyc.bank?.accountMasked || '',
        bankName: kyc.bank?.bankName || '',
        beneficiaryName: kyc.bank?.beneficiaryName || '',
        verifiedAt: kyc.bank?.verifiedAt || null
      },
      nameMatching: kyc.nameMatching,
      adminReview: kyc.adminReview,
      auditLogs: kyc.auditLogs
    },
    providersConfigured: configStatus
  });
};

/**
 * POST /api/seller/kyc/phone/verify
 * Real Firebase Phone Auth verification
 */
export const verifyPhoneKyc = async (req, res) => {
  const userId = req.user.id;
  const { idToken, phoneNumber } = req.body;

  if (!idToken || !phoneNumber) {
    throw new ApiError(400, 'Firebase ID Token and Phone Number are required.');
  }

  const kyc = await getOrCreateSellerKyc(userId);
  const result = await verifyPhoneWithFirebase({ idToken, phoneNumber });

  if (!result.success) {
    kyc.phone.status = 'FAILED';
    kyc.phone.failureReason = result.message;
    kyc.auditLogs.push(
      createAuditEntry({
        event: AUDIT_EVENTS.KYC_FAILED,
        actor: { userId, role: req.user.role },
        status: 'FAILED',
        details: { step: 'phone', reason: result.message }
      })
    );
    await kyc.save();
    return res.status(400).json(result);
  }

  kyc.phone.status = 'VERIFIED';
  kyc.phone.phoneMasked = result.phoneMasked;
  kyc.phone.phoneE164 = result.phoneE164;
  kyc.phone.provider = 'firebase';
  kyc.phone.firebaseUid = result.firebaseUid;
  kyc.phone.verifiedAt = result.verifiedAt;
  kyc.phone.failureReason = null;

  kyc.auditLogs.push(
    createAuditEntry({
      event: AUDIT_EVENTS.PHONE_VERIFIED,
      actor: { userId, role: req.user.role },
      verificationRef: result.firebaseUid,
      status: 'VERIFIED',
      details: { phoneMasked: result.phoneMasked }
    })
  );

  await kyc.save();

  // Sync with User model
  await User.findByIdAndUpdate(userId, {
    phone: result.phoneE164.replace('+91', ''),
    phoneE164: result.phoneE164,
    phoneVerified: true,
    phoneVerifiedAt: new Date(),
    isPhoneVerified: true
  });

  res.status(200).json(result);
};

/**
 * POST /api/seller/kyc/aadhaar/start
 * Initiates real Aadhaar OTP verification via compliant Sub-AUA provider
 */
export const startAadhaarKyc = async (req, res) => {
  const userId = req.user.id;
  const { aadhaarNumber, consent } = req.body;

  if (!consent) {
    throw new ApiError(400, 'Explicit consent is mandatory for Aadhaar verification.');
  }
  if (!aadhaarNumber) {
    throw new ApiError(400, '12-digit Aadhaar number is required.');
  }

  const kyc = await getOrCreateSellerKyc(userId);
  const result = await initiateAadhaarKyc({ aadhaarNumber, consent, userId });

  if (!result.configured) {
    kyc.aadhaar.status = 'NOT_CONFIGURED';
    kyc.aadhaar.aadhaarMasked = result.aadhaarMasked;
    kyc.auditLogs.push(
      createAuditEntry({
        event: AUDIT_EVENTS.KYC_FAILED,
        actor: { userId, role: req.user.role },
        status: 'NOT_CONFIGURED',
        details: { step: 'aadhaar', reason: 'Provider not configured in environment' }
      })
    );
    await kyc.save();
    return res.status(503).json(result);
  }

  if (!result.success) {
    kyc.aadhaar.status = 'FAILED';
    kyc.aadhaar.failureReason = result.message;
    await kyc.save();
    return res.status(400).json(result);
  }

  kyc.aadhaar.status = 'PENDING';
  kyc.aadhaar.refId = result.refId;
  kyc.aadhaar.aadhaarMasked = result.aadhaarMasked;
  kyc.aadhaar.consentObtained = true;
  kyc.aadhaar.consentTimestamp = result.consentTimestamp;
  kyc.aadhaar.provider = result.provider;

  kyc.auditLogs.push(
    createAuditEntry({
      event: AUDIT_EVENTS.AADHAAR_VERIFICATION_STARTED,
      actor: { userId, role: req.user.role },
      verificationRef: result.refId,
      status: 'PENDING',
      details: { aadhaarMasked: result.aadhaarMasked }
    })
  );

  await kyc.save();
  res.status(200).json(result);
};

/**
 * POST /api/seller/kyc/aadhaar/verify
 * Submits the real Aadhaar OTP to compliant provider
 */
export const completeAadhaarKyc = async (req, res) => {
  const userId = req.user.id;
  const { refId, otp, consent } = req.body;

  if (!refId || !otp) {
    throw new ApiError(400, 'Provider reference ID and 6-digit OTP are required.');
  }

  const kyc = await getOrCreateSellerKyc(userId);
  const result = await verifyAadhaarOtp({ refId, otp, consent });

  if (!result.configured) {
    kyc.aadhaar.status = 'NOT_CONFIGURED';
    await kyc.save();
    return res.status(503).json(result);
  }

  if (!result.success) {
    kyc.aadhaar.status = 'FAILED';
    kyc.aadhaar.failureReason = result.message;
    kyc.auditLogs.push(
      createAuditEntry({
        event: AUDIT_EVENTS.KYC_FAILED,
        actor: { userId, role: req.user.role },
        verificationRef: refId,
        status: 'FAILED',
        details: { step: 'aadhaar', reason: result.message }
      })
    );
    await kyc.save();
    return res.status(400).json(result);
  }

  kyc.aadhaar.status = 'VERIFIED';
  kyc.aadhaar.aadhaarMasked = result.aadhaarMasked;
  kyc.aadhaar.nameOnAadhaar = result.nameOnAadhaar;
  kyc.aadhaar.providerRef = result.providerRef;
  kyc.aadhaar.dob = result.dob;
  kyc.aadhaar.gender = result.gender;
  kyc.aadhaar.verifiedAt = result.verifiedAt;
  kyc.aadhaar.failureReason = null;

  // Cross-check name consistency
  const matchResult = evaluateIdentityConsistency({
    applicantName: kyc.applicantName,
    aadhaarName: result.nameOnAadhaar,
    panName: kyc.pan?.nameOnPan,
    bankAccountName: kyc.bank?.beneficiaryName
  });
  kyc.nameMatching = matchResult;

  kyc.auditLogs.push(
    createAuditEntry({
      event: AUDIT_EVENTS.AADHAAR_VERIFIED,
      actor: { userId, role: req.user.role },
      verificationRef: result.providerRef,
      status: 'VERIFIED',
      details: {
        nameOnAadhaar: result.nameOnAadhaar,
        aadhaarMasked: result.aadhaarMasked,
        nameMatch: matchResult.status
      }
    })
  );

  await kyc.save();
  res.status(200).json(result);
};

/**
 * POST /api/seller/kyc/pan/verify
 * Real Income Tax Dept PAN verification
 */
export const verifyPanKyc = async (req, res) => {
  const userId = req.user.id;
  const { panNumber, applicantName, dob } = req.body;

  if (!panNumber) {
    throw new ApiError(400, 'PAN number is required.');
  }

  const kyc = await getOrCreateSellerKyc(userId);
  const effectiveName = applicantName || kyc.applicantName;

  const result = await verifyPanWithProvider({
    panNumber,
    applicantName: effectiveName,
    dob
  });

  if (!result.configured) {
    kyc.pan.status = 'NOT_CONFIGURED';
    kyc.pan.panMasked = result.panMasked;
    kyc.auditLogs.push(
      createAuditEntry({
        event: AUDIT_EVENTS.KYC_FAILED,
        actor: { userId, role: req.user.role },
        status: 'NOT_CONFIGURED',
        details: { step: 'pan', reason: 'Provider not configured in environment' }
      })
    );
    await kyc.save();
    return res.status(503).json(result);
  }

  if (!result.success && result.status !== 'NEEDS_REVIEW') {
    kyc.pan.status = 'FAILED';
    kyc.pan.panMasked = result.panMasked;
    kyc.pan.failureReason = result.message;
    await kyc.save();
    return res.status(400).json(result);
  }

  kyc.pan.status = result.status; // 'VERIFIED' or 'NEEDS_REVIEW'
  kyc.pan.panMasked = result.panMasked;
  kyc.pan.nameOnPan = result.nameOnPan;
  kyc.pan.provider = result.provider;
  kyc.pan.providerRef = result.providerRef;
  kyc.pan.verifiedAt = result.verifiedAt;
  kyc.pan.failureReason = null;

  // Re-evaluate cross-match
  const matchResult = evaluateIdentityConsistency({
    applicantName: kyc.applicantName,
    aadhaarName: kyc.aadhaar?.nameOnAadhaar,
    panName: result.nameOnPan,
    bankAccountName: kyc.bank?.beneficiaryName
  });
  kyc.nameMatching = matchResult;

  kyc.auditLogs.push(
    createAuditEntry({
      event: result.status === 'VERIFIED' ? AUDIT_EVENTS.PAN_VERIFIED : AUDIT_EVENTS.KYC_NEEDS_REVIEW,
      actor: { userId, role: req.user.role },
      verificationRef: result.providerRef,
      status: result.status,
      details: {
        panMasked: result.panMasked,
        nameOnPan: result.nameOnPan,
        nameMatch: matchResult.status
      }
    })
  );

  await kyc.save();
  res.status(200).json(result);
};

/**
 * POST /api/seller/kyc/bank/verify
 * Real Bank Account Penny Drop / NPCI Verification
 */
export const verifyBankKyc = async (req, res) => {
  const userId = req.user.id;
  const { accountNumber, ifscCode, accountHolderName } = req.body;

  if (!accountNumber || !ifscCode) {
    throw new ApiError(400, 'Bank account number and IFSC code are required.');
  }

  const kyc = await getOrCreateSellerKyc(userId);
  const effectiveHolder = accountHolderName || kyc.applicantName;

  const result = await verifyBankAccountWithProvider({
    accountNumber,
    ifscCode,
    accountHolderName: effectiveHolder,
    panName: kyc.pan?.nameOnPan
  });

  if (!result.configured) {
    kyc.bank.status = 'NOT_CONFIGURED';
    kyc.bank.accountMasked = result.accountMasked;
    kyc.bank.ifscCode = result.ifscCode;
    kyc.auditLogs.push(
      createAuditEntry({
        event: AUDIT_EVENTS.KYC_FAILED,
        actor: { userId, role: req.user.role },
        status: 'NOT_CONFIGURED',
        details: { step: 'bank', reason: 'Provider not configured in environment' }
      })
    );
    await kyc.save();
    return res.status(503).json(result);
  }

  if (!result.success && result.status !== 'NEEDS_REVIEW') {
    kyc.bank.status = 'FAILED';
    kyc.bank.accountMasked = result.accountMasked;
    kyc.bank.ifscCode = result.ifscCode;
    kyc.bank.failureReason = result.message;
    await kyc.save();
    return res.status(400).json(result);
  }

  kyc.bank.status = result.status; // 'VERIFIED' or 'NEEDS_REVIEW'
  kyc.bank.accountMasked = result.accountMasked;
  kyc.bank.ifscCode = result.ifscCode;
  kyc.bank.bankName = result.bankName;
  kyc.bank.beneficiaryName = result.beneficiaryName;
  kyc.bank.provider = result.provider;
  kyc.bank.providerRef = result.providerRef;
  kyc.bank.verifiedAt = result.verifiedAt;
  kyc.bank.failureReason = null;

  // Re-evaluate cross-match
  const matchResult = evaluateIdentityConsistency({
    applicantName: kyc.applicantName,
    aadhaarName: kyc.aadhaar?.nameOnAadhaar,
    panName: kyc.pan?.nameOnPan,
    bankAccountName: result.beneficiaryName
  });
  kyc.nameMatching = matchResult;

  kyc.auditLogs.push(
    createAuditEntry({
      event: result.status === 'VERIFIED' ? AUDIT_EVENTS.BANK_VERIFIED : AUDIT_EVENTS.KYC_NEEDS_REVIEW,
      actor: { userId, role: req.user.role },
      verificationRef: result.providerRef,
      status: result.status,
      details: {
        accountMasked: result.accountMasked,
        beneficiaryName: result.beneficiaryName,
        nameMatch: matchResult.status
      }
    })
  );

  await kyc.save();
  res.status(200).json(result);
};

/**
 * GET /api/admin/seller-applications/:id/kyc
 * Admin-only: Views full KYC compliance dossier with masked sensitive fields
 */
export const getAdminApplicationKyc = async (req, res) => {
  const { id } = req.params;
  const application = await SellerApplication.findById(id);

  if (!application) {
    throw new ApiError(404, 'Seller application not found.');
  }

  let kyc = await SellerKYC.findOne({
    $or: [{ applicationId: application._id }, { userId: application.userId }]
  });

  if (!kyc) {
    kyc = await getOrCreateSellerKyc(application.userId);
  }

  res.status(200).json({
    success: true,
    application: {
      id: application._id,
      shopName: application.shopName,
      brandName: application.brandName,
      applicantName: application.applicantName,
      email: application.email,
      phone: application.phone,
      status: application.status,
      riskLevel: application.riskLevel
    },
    kyc: {
      id: kyc._id,
      overallStatus: kyc.overallStatus,
      phone: kyc.phone,
      aadhaar: kyc.aadhaar,
      pan: kyc.pan,
      bank: kyc.bank,
      nameMatching: kyc.nameMatching,
      auditLogs: kyc.auditLogs,
      adminReview: kyc.adminReview
    }
  });
};

/**
 * PUT /api/admin/seller-applications/:id/kyc/review
 * Admin-only: Record compliance review or request re-verification
 * NOTE: Admin CANNOT falsely mark an unverified provider check as VERIFIED.
 */
export const reviewKycByAdmin = async (req, res) => {
  const { id } = req.params;
  const { decision, notes } = req.body;
  const adminId = req.user.id;

  if (!['APPROVED', 'REJECTED', 'REQUEST_REVERIFY'].includes(decision)) {
    throw new ApiError(400, 'Invalid review decision. Must be APPROVED, REJECTED, or REQUEST_REVERIFY.');
  }

  const application = await SellerApplication.findById(id);
  if (!application) {
    throw new ApiError(404, 'Seller application not found.');
  }

  let kyc = await SellerKYC.findOne({
    $or: [{ applicationId: application._id }, { userId: application.userId }]
  });

  if (!kyc) {
    kyc = await getOrCreateSellerKyc(application.userId);
  }

  // Strict Rule 11: Admin cannot falsely mark provider verification as successful if required checks are unverified
  if (decision === 'APPROVED') {
    const isReady =
      kyc.phone?.status === 'VERIFIED' &&
      kyc.aadhaar?.status === 'VERIFIED' &&
      kyc.pan?.status === 'VERIFIED' &&
      kyc.bank?.status === 'VERIFIED';

    if (!isReady && kyc.nameMatching?.status === 'MISMATCH') {
      throw new ApiError(
        400,
        'Cannot approve KYC: Name mismatch detected across official identity records. Seller must re-verify or submit clarifying legal proof.'
      );
    }
  }

  kyc.adminReview = {
    reviewedBy: adminId,
    reviewedAt: new Date(),
    notes: notes || '',
    decision
  };

  kyc.auditLogs.push(
    createAuditEntry({
      event: AUDIT_EVENTS.ADMIN_KYC_REVIEWED,
      actor: { userId: adminId, role: 'admin' },
      status: decision,
      details: { notes, decision }
    })
  );

  if (decision === 'REQUEST_REVERIFY') {
    kyc.overallStatus = 'NEEDS_REVIEW';
    application.status = 'REQUEST_CHANGES';
    application.adminNotes = notes || 'Compliance team requested KYC re-verification.';
    await application.save();
  }

  await kyc.save();

  res.status(200).json({
    success: true,
    message: `KYC review recorded successfully (${decision}).`,
    adminReview: kyc.adminReview,
    overallStatus: kyc.overallStatus
  });
};

export default {
  getMyKycStatus,
  verifyPhoneKyc,
  startAadhaarKyc,
  completeAadhaarKyc,
  verifyPanKyc,
  verifyBankKyc,
  getAdminApplicationKyc,
  reviewKycByAdmin
};
