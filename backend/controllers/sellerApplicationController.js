import SellerApplication from '../models/SellerApplication.js'
import Seller from '../models/Seller.js'
import User from '../models/User.js'
import Subscription from '../models/Subscription.js'
import { notifyUser } from '../services/notificationService.js'
import { ApiError } from '../middleware/errorHandler.js'
import { generateSellerAgreementPdf } from '../services/sellerAgreementPdfService.js'

// Reserved / prohibited shop names to prevent deceptive branding
const PROHIBITED_KEYWORDS = [
  'official', 'amazon', 'flipkart', 'myntra', 'nike', 'adidas', 
  'zara', 'h&m', 'gucci', 'prada', 'sklp official', 'admin', 'support'
]

// Slugify helper
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')

/**
 * Check if a shop or brand name is valid, unique, and available
 */
export const checkShopNameAvailability = async (req, res) => {
  const rawInput = (req.query.brandName || req.query.shopName || '').trim()

  if (!rawInput || rawInput.length < 3) {
    throw new ApiError(400, 'Brand or shop name must be at least 3 characters long')
  }

  const normalized = rawInput.toLowerCase()
  const slug = slugify(rawInput)
  const brandNormalized = rawInput.toLowerCase().replace(/[^a-z0-9]/g, '')

  // 1. Check prohibited keywords
  const isProhibited = PROHIBITED_KEYWORDS.some(kw => normalized.includes(kw))
  if (isProhibited) {
    return res.status(200).json({
      success: true,
      available: false,
      reason: 'This name contains trademarked or reserved keywords. Brand authorization required.'
    })
  }

  // 2. Check existing approved sellers (by shopSlug, shopName, brandName, brandNameNormalized)
  const existingSeller = await Seller.findOne({
    $or: [
      { shopSlug: slug },
      { shopName: new RegExp(`^${rawInput}$`, 'i') },
      { brandName: new RegExp(`^${rawInput}$`, 'i') },
      { brandNameNormalized: brandNormalized }
    ]
  })

  // 3. Check pending approved applications
  const existingApp = await SellerApplication.findOne({
    $or: [
      { shopName: new RegExp(`^${rawInput}$`, 'i') },
      { brandName: new RegExp(`^${rawInput}$`, 'i') },
      { brandNameNormalized: brandNormalized }
    ],
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PENDING_REVIEW'] }
  })

  const isAvailable = !existingSeller && !existingApp

  res.status(200).json({
    success: true,
    available: isAvailable,
    slug,
    reason: isAvailable
      ? 'Brand identity is unique and available!'
      : 'This brand or shop name is already registered by another merchant. Every brand name must be unique.'
  })
}

/**
 * Submit / Update a Seller Application
 */
export const submitSellerApplication = async (req, res) => {
  const userId = req.user?.id || req.user?._id
  const {
    applicantName,
    ownerName,
    dob,
    email,
    phone,
    altPhone,
    shopName,
    brandName,
    businessType,
    productCategories,
    storeDescription,
    category,
    subcategory,
    businessEmail,
    businessPhone,
    yearEstablished,
    brandLogo,
    businessAddress,
    pickupAddressSameAsBusiness,
    pickupAddress,
    deliveryMode,
    shopImages,
    ownerPhoto,
    signature,
    panNumber,
    gstNumber,
    bankDetails,
    verification,
    documents,
    termsAccepted,
    sellerTermsVersion
  } = req.body

  const user = await User.findById(userId)
  if (!user) throw new ApiError(404, 'User not found')

  if (user.role === 'seller') {
    throw new ApiError(400, 'You already have an active seller account.')
  }

  // ── Step 1 Validation: Owner Details ──────────────────────────────────────
  const resolvedName = (ownerName || applicantName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '').trim()
  const resolvedEmail = (email || user.email || '').toLowerCase().trim()
  const resolvedPhone = (phone || user.phone || '').trim()

  if (!resolvedName || resolvedName.length < 3) {
    throw new ApiError(400, 'Please enter the owner full legal name (minimum 3 characters).')
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/
  if (!resolvedEmail || !emailRegex.test(resolvedEmail)) {
    throw new ApiError(400, 'Please provide a valid email address.')
  }

  const phoneDigits = resolvedPhone.replace(/\D/g, '')
  if (!phoneDigits || phoneDigits.length < 10) {
    throw new ApiError(400, 'Please provide a valid 10-digit mobile number.')
  }

  // ── Step 2 Validation: Shop Details & Brand Uniqueness ─────────────────────
  if (!shopName || shopName.trim().length < 3) {
    throw new ApiError(400, 'Please provide a valid shop name (minimum 3 characters).')
  }

  const effectiveBrand = (brandName || shopName).trim()
  const effectiveShop = shopName.trim()
  const brandNormalized = effectiveBrand.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Check against other approved sellers
  const existingSellerBrand = await Seller.findOne({
    $or: [
      { brandNameNormalized: brandNormalized },
      { shopSlug: slugify(effectiveShop) }
    ],
    userId: { $ne: userId }
  })
  if (existingSellerBrand) {
    throw new ApiError(409, `The brand "${effectiveBrand}" is already registered by another merchant. Every brand identity must be unique.`)
  }

  // Check against other pending applications
  const existingPendingApp = await SellerApplication.findOne({
    brandNameNormalized: brandNormalized,
    userId: { $ne: userId },
    status: { $in: ['PENDING_REVIEW', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] }
  })
  if (existingPendingApp) {
    throw new ApiError(409, `The brand "${effectiveBrand}" is already under review in another application. Every brand identity must be unique.`)
  }

  // ── Step 3 Validation: Business & Pickup Address ──────────────────────────
  if (!businessAddress || !businessAddress.street || !businessAddress.city || !businessAddress.state || !businessAddress.postalCode) {
    throw new ApiError(400, 'Please provide complete business address including street, city, state, and PIN code.')
  }

  const pinDigits = String(businessAddress.postalCode).replace(/\D/g, '')
  if (pinDigits.length !== 6) {
    throw new ApiError(400, 'Please provide a valid 6-digit Indian PIN code for business address.')
  }

  const isPickupSame = pickupAddressSameAsBusiness !== false
  const resolvedPickup = isPickupSame ? businessAddress : (pickupAddress || businessAddress)

  if (!isPickupSame) {
    if (!resolvedPickup.street || !resolvedPickup.city || !resolvedPickup.state || !resolvedPickup.postalCode) {
      throw new ApiError(400, 'Please provide complete pickup address.')
    }
  }

  // ── Step 4 Validation: Shop Photos (Min 2, Max 4) ──────────────────────────
  const validShopImages = Array.isArray(shopImages) ? shopImages.filter(img => img && (img.url || typeof img === 'string')) : []
  if (validShopImages.length < 2) {
    throw new ApiError(400, 'Please upload at least 2 clear shop photographs representing your business.')
  }
  if (validShopImages.length > 4) {
    throw new ApiError(400, 'A maximum of 4 shop photographs can be uploaded.')
  }

  const normalizedShopImages = validShopImages.map(img => {
    if (typeof img === 'string') {
      return { url: img, publicId: null, imageType: 'shop_front', uploadedAt: new Date() }
    }
    return {
      url: img.url,
      publicId: img.publicId || null,
      imageType: img.imageType || 'shop_front',
      uploadedAt: img.uploadedAt || new Date()
    }
  })

  // ── Step 5 Validation: Owner Photograph (1 Required) ───────────────────────
  if (!ownerPhoto || (!ownerPhoto.url && typeof ownerPhoto !== 'string')) {
    throw new ApiError(400, 'Please upload one clear owner photograph (half-body/waist-up).')
  }

  const normalizedOwnerPhoto = typeof ownerPhoto === 'string'
    ? { url: ownerPhoto, publicId: null, uploadedAt: new Date() }
    : { url: ownerPhoto.url, publicId: ownerPhoto.publicId || null, uploadedAt: ownerPhoto.uploadedAt || new Date() }

  // ── Step 6 Validation: Signature (1 Required) ──────────────────────────────
  if (!signature || (!signature.url && typeof signature !== 'string')) {
    throw new ApiError(400, 'Please upload a clear signature image.')
  }

  const normalizedSignature = typeof signature === 'string'
    ? { url: signature, publicId: null, uploadedAt: new Date() }
    : { url: signature.url, publicId: signature.publicId || null, uploadedAt: signature.uploadedAt || new Date() }

  // ── Step 7 Validation: Terms & Conditions Acceptance ───────────────────────
  if (termsAccepted !== true) {
    throw new ApiError(400, 'You must read and agree to the STYLE STREET Seller Terms & Conditions to submit your application.')
  }

  // ── Anti-Cheating & Duplicate Check ───────────────────────────────────────
  let riskScore = 0
  const riskFlags = []

  const dupChecks = [{ email: resolvedEmail }]
  if (resolvedPhone) dupChecks.push({ phone: resolvedPhone })
  const duplicateRejected = await SellerApplication.findOne({
    $or: dupChecks,
    userId: { $ne: userId },
    status: { $in: ['REJECTED', 'SUSPENDED'] }
  })
  if (duplicateRejected) {
    riskScore += 45
    riskFlags.push('DUPLICATE_RISK')
    riskFlags.push('Phone or email was associated with a previously rejected/suspended seller application.')
  }

  if (gstNumber) {
    const dupGst = await SellerApplication.findOne({
      gstNumber: gstNumber.toUpperCase(),
      userId: { $ne: userId },
      status: { $in: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW'] }
    })
    if (dupGst) {
      riskScore += 40
      riskFlags.push('DUPLICATE_RISK')
      riskFlags.push('GSTIN is already associated with another seller account.')
    }
  }

  const cappedRiskScore = Math.min(100, Math.max(0, riskScore))
  const riskLevel = cappedRiskScore >= 50 ? 'HIGH_RISK' : cappedRiskScore >= 20 ? 'MEDIUM_RISK' : 'LOW_RISK'

  // ── Existing Application & Idempotency / Resubmission ─────────────────────
  let application = await SellerApplication.findOne({ userId })
  const isResubmission = application && (
    application.status === 'NEEDS_CORRECTION' ||
    application.status === 'REQUEST_CHANGES' ||
    application.status === 'REJECTED' ||
    application.status === 'REVIEW_REQUIRED'
  )

  // Prevent duplicate submissions caused by double-clicking (submitted within last 10s)
  if (application && application.status === 'PENDING_REVIEW' && application.updatedAt && (Date.now() - new Date(application.updatedAt).getTime() < 10000)) {
    return res.status(200).json({
      success: true,
      message: 'Seller application is already submitted and currently under review.',
      application: {
        _id: application._id,
        id: application._id,
        applicationReference: application.applicationReference,
        shopName: application.shopName,
        brandName: application.brandName,
        status: application.status,
        submittedAt: application.updatedAt
      }
    })
  }

  if (!application) {
    application = new SellerApplication({ userId })
  }

  application.applicantName = resolvedName
  application.ownerName = resolvedName
  if (dob) application.dob = dob
  application.email = resolvedEmail
  application.phone = resolvedPhone
  application.altPhone = altPhone ? altPhone.trim() : ''
  application.shopName = effectiveShop
  application.brandName = effectiveBrand
  application.brandNameNormalized = brandNormalized
  if (productCategories && Array.isArray(productCategories)) {
    application.productCategories = productCategories
  }
  application.storeDescription = storeDescription || ''
  application.category = category || (productCategories?.[0] || 'Apparel')
  application.subcategory = subcategory || ''
  application.businessEmail = businessEmail ? businessEmail.toLowerCase().trim() : resolvedEmail
  application.businessPhone = businessPhone ? businessPhone.trim() : resolvedPhone
  if (yearEstablished) application.yearEstablished = Number(yearEstablished)
  if (brandLogo) application.brandLogo = brandLogo

  const normBusinessType = (businessType || 'individual').toLowerCase().trim()
  const validBusinessTypes = ['individual', 'proprietorship', 'partnership', 'pvt_ltd', 'other']
  application.businessType = validBusinessTypes.includes(normBusinessType) ? normBusinessType : 'individual'

  application.businessAddress = businessAddress
  application.pickupAddressSameAsBusiness = isPickupSame
  application.pickupAddress = resolvedPickup

  application.shopImages = normalizedShopImages
  application.ownerPhoto = normalizedOwnerPhoto
  application.signature = normalizedSignature

  application.termsAccepted = true
  application.sellerTermsVersion = sellerTermsVersion || 'v1.0'
  application.termsAcceptedAt = new Date()
  application.termsAcceptedIp = req.ip || req.headers['x-forwarded-for'] || ''

  application.deliveryMode = deliveryMode || 'PAID_DELIVERY'
  if (panNumber) application.panNumber = panNumber.toUpperCase()
  application.gstNumber = gstNumber ? gstNumber.toUpperCase() : ''
  if (bankDetails) application.bankDetails = bankDetails

  if (verification && typeof verification === 'object') {
    application.verification = { ...application.verification, ...verification }
  }
  if (documents && Array.isArray(documents)) {
    application.documents = documents
  }

  const initialStatus = 'PENDING_REVIEW'
  application.status = initialStatus
  application.correctionReason = '' // Cleared upon fresh resubmission
  application.riskScore = cappedRiskScore
  application.riskLevel = riskLevel
  application.riskFlags = [...new Set(riskFlags)]
  application.reviewFlags = application.riskFlags

  application.auditLogs.push({
    action: isResubmission ? 'APPLICATION_RESUBMITTED' : 'APPLICATION_SUBMITTED',
    newStatus: initialStatus,
    reason: isResubmission ? 'Applicant corrected and resubmitted seller application.' : 'Applicant submitted seller onboarding application.',
    timestamp: new Date()
  })

  // Synchronize or link SellerKYC record
  try {
    const SellerKYC = (await import('../models/SellerKYC.js')).default
    let kyc = await SellerKYC.findOne({ userId })
    if (!kyc) {
      kyc = new SellerKYC({
        userId,
        applicationId: application._id,
        applicantName: application.applicantName,
        overallStatus: 'NOT_STARTED'
      })
    } else {
      kyc.applicationId = application._id
      kyc.applicantName = application.applicantName
    }
    if (documents && Array.isArray(documents)) {
      kyc.documents = documents
    }
    await kyc.save()
    application.kyc = kyc._id
    application.kycStatus = kyc.overallStatus
  } catch (_kycErr) {
    // Non-fatal
  }

  await application.save()

  res.status(200).json({
    success: true,
    message: isResubmission
      ? 'Your corrected seller application has been resubmitted successfully for review.'
      : 'Seller application submitted successfully. It is now under review by our compliance team.',
    application: {
      _id: application._id,
      id: application._id,
      applicationReference: application.applicationReference,
      shopName: application.shopName,
      brandName: application.brandName,
      status: application.status,
      riskLevel: application.riskLevel,
      submittedAt: application.updatedAt
    }
  })
}

/**
 * Get current user's seller application status
 */
export const getMyApplicationStatus = async (req, res) => {
  const userId = req.user.id
  const application = await SellerApplication.findOne({ userId }).lean()
  const seller = await Seller.findOne({ userId }).lean()

  res.status(200).json({
    success: true,
    hasApplication: !!application,
    application: application || null,
    isApprovedSeller: !!seller,
    seller: seller || null
  })
}

/**
 * Admin: Get all seller applications with filter & risk levels
 */
export const getAdminSellerApplications = async (req, res) => {
  const { status, riskLevel, search } = req.query
  const query = {}

  if (status && status !== 'ALL') query.status = status
  if (riskLevel && riskLevel !== 'ALL') query.riskLevel = riskLevel

  if (search) {
    query.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { applicantName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ]
  }

  const applications = await SellerApplication.find(query)
    .populate('userId', 'firstName lastName email phone isEmailVerified isPhoneVerified createdAt')
    .sort({ createdAt: -1 })
    .lean()

  res.status(200).json({
    success: true,
    count: applications.length,
    applications
  })
}

/**
 * Admin: Review Seller Application (Approve, Reject, Request Info, Suspend)
 */
export const reviewSellerApplication = async (req, res) => {
  const { id } = req.params
  const { action, notes, reason } = req.body // action: 'APPROVE', 'REJECT', 'REQUEST_INFO', 'SUSPEND', 'REACTIVATE'
  const adminId = req.user?.id || req.user?._id

  const application = await SellerApplication.findById(id)
  if (!application) {
    throw new ApiError(404, 'Seller application not found')
  }

  // ── Self-Approval Guard ──────────────────────────────────────────────────────
  // An admin cannot approve, reject, or suspend their own seller application
  if (
    (action === 'APPROVE' || action === 'REJECT' || action === 'SUSPEND') &&
    application.userId.toString() === adminId.toString()
  ) {
    throw new ApiError(403, 'Administrators cannot review their own seller application.')
  }

  const user = await User.findById(application.userId)
  if (!user) {
    throw new ApiError(404, 'User account associated with this application not found')
  }

  const oldStatus = application.status

  if (action === 'APPROVE') {
    application.status = 'APPROVED'
    application.adminNotes = notes || 'Application approved by administrator.'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()
    application.approvedBy = adminId
    application.approvedAt = new Date()

    // 1. Update User Role to 'seller'
    user.role = 'seller'
    user.sellerProfile = {
      storeName: application.shopName,
      brandName: application.brandName || application.shopName,
      gstNumber: application.gstNumber,
      panNumber: application.panNumber,
      bankDetails: application.bankDetails,
      isVerified: true,
      verifiedAt: new Date()
    }
    await user.save()

    // 2. Create / Activate dedicated Seller record with normalized brand
    const slug = slugify(application.shopName)
    const brandName = application.brandName || application.shopName
    const brandNameNormalized = application.brandNameNormalized || brandName.toLowerCase().replace(/[^a-z0-9]/g, '')

    let seller = await Seller.findOne({ userId: user._id })
    if (!seller) {
      seller = new Seller({
        userId: user._id,
        shopName: application.shopName,
        shopSlug: slug,
        brandName,
        brandNameNormalized,
        brandLocked: true,
        deliveryMode: application.deliveryMode || 'PAID_DELIVERY',
        pickupAddress: application.pickupAddress || application.businessAddress || {},
        businessType: application.businessType,
        bankDetails: { ...(application.bankDetails || {}), isVerified: true },
        approvalStatus: 'APPROVED',
        verificationStatus: 'verified',
        sellerStatus: 'active',
        riskStatus: 'ACTIVE',
        subscriptionStatus: 'trial',
        currentPlan: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
    } else {
      seller.shopName = application.shopName
      seller.shopSlug = slug
      seller.brandName = brandName
      seller.brandNameNormalized = brandNameNormalized
      seller.brandLocked = true
      seller.deliveryMode = application.deliveryMode || seller.deliveryMode || 'PAID_DELIVERY'
      if (application.pickupAddress) seller.pickupAddress = application.pickupAddress
      seller.approvalStatus = 'APPROVED'
      seller.verificationStatus = 'verified'
      seller.sellerStatus = 'active'
      seller.riskStatus = 'ACTIVE'
    }
    await seller.save()

    // Link KYC record to newly activated Seller profile
    try {
      const SellerKYC = (await import('../models/SellerKYC.js')).default;
      await SellerKYC.findOneAndUpdate(
        { $or: [{ applicationId: application._id }, { userId: application.userId }] },
        { sellerId: seller._id }
      );
    } catch (_kycLinkErr) {
      // non-fatal
    }

    // 3. Initialize 30-Day Free Trial Subscription
    let subscription = await Subscription.findOne({ sellerId: seller._id })
    if (!subscription) {
      subscription = new Subscription({
        sellerId: seller._id,
        plan: 'trial',
        amount: 0,
        status: 'TRIAL',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      await subscription.save()
    }

    // 4. Send Notification to User
    await notifyUser({
      userId: user._id,
      type: 'seller_approved',
      title: '🎉 Congratulations! Your Seller Account is Approved',
      message: `Your brand "${brandName}" is now active with a 30-day Free Trial. Access your Seller Hub to start listing products.`,
      actionUrl: '/seller/dashboard',
      relatedEntity: { entityType: 'seller', entityId: seller._id }
    })
  } else if (action === 'REJECT') {
    if (!notes && !reason) {
      throw new ApiError(400, 'A mandatory rejection reason must be provided.')
    }
    application.status = 'REJECTED'
    application.adminNotes = notes || reason
    application.rejectionReason = notes || reason
    application.reviewedBy = adminId
    application.reviewedAt = new Date()

    const seller = await Seller.findOne({ userId: user._id })
    if (seller) {
      seller.approvalStatus = 'REJECTED'
      seller.verificationStatus = 'rejected'
      seller.sellerStatus = 'inactive'
      await seller.save()
    }

    await notifyUser({
      userId: user._id,
      type: 'seller_rejected',
      title: 'Seller Application Status Update',
      message: `Your application for "${application.shopName}" could not be approved. Reason: ${reason || notes}.`,
      actionUrl: '/become-a-seller'
    })
  } else if (action === 'REQUEST_INFO' || action === 'REQUEST_CHANGES' || action === 'NEEDS_CORRECTION') {
    if (!notes && !reason) {
      throw new ApiError(400, 'A specific correction reason is mandatory.')
    }
    application.status = 'NEEDS_CORRECTION'
    application.adminNotes = notes || reason
    application.correctionReason = notes || reason
    application.reviewedBy = adminId
    application.reviewedAt = new Date()

    await notifyUser({
      userId: user._id,
      type: 'seller_info_required',
      title: 'Action Required: Seller Application Correction Needed',
      message: notes || reason || 'Please correct your business details or re-upload required documents.',
      actionUrl: '/become-a-seller'
    })
  } else if (action === 'SUSPEND') {
    application.status = 'SUSPENDED'
    application.adminNotes = notes || reason || 'Account suspended by administrator.'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()
    // Downgrade role to prevent seller dashboard access
    user.role = 'customer'
    await user.save()
    const seller = await Seller.findOne({ userId: user._id })
    if (seller) {
      seller.approvalStatus = 'SUSPENDED'
      seller.verificationStatus = 'suspended'
      seller.sellerStatus = 'suspended'
      await seller.save()
    }
    await notifyUser({
      userId: user._id,
      type: 'seller_suspended',
      title: 'Seller Account Suspended',
      message: `Your seller account has been suspended. Reason: ${notes || reason || 'Please contact support.'}`,
      actionUrl: '/profile',
      relatedEntity: { entityType: 'seller', entityId: application._id }
    })
  } else if (action === 'REACTIVATE') {
    application.status = 'APPROVED'
    application.adminNotes = notes || 'Account reactivated by administrator.'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()
    // Restore seller role
    user.role = 'seller'
    await user.save()
    const seller = await Seller.findOne({ userId: user._id })
    if (seller) {
      seller.approvalStatus = 'APPROVED'
      seller.verificationStatus = 'verified'
      seller.sellerStatus = 'active'
      await seller.save()
    }
    await notifyUser({
      userId: user._id,
      type: 'seller_reactivated',
      title: 'Seller Account Reactivated',
      message: 'Your seller account has been reactivated. You can now access the Seller Hub.',
      actionUrl: '/seller/dashboard',
      relatedEntity: { entityType: 'seller', entityId: application._id }
    })
  } else {
    throw new ApiError(400, `Unknown review action: ${action}. Valid actions: APPROVE, REJECT, REQUEST_INFO, REQUEST_CHANGES, NEEDS_CORRECTION, SUSPEND, REACTIVATE`)
  }

  application.auditLogs.push({
    adminId,
    action: `ADMIN_${action}`,
    oldStatus,
    newStatus: application.status,
    reason: notes || reason || `Action performed: ${action}`,
    timestamp: new Date()
  })

  await application.save()

  res.status(200).json({
    success: true,
    message: `Application ${application.status.toLowerCase()} successfully`,
    application
  })
}

/**
 * Get / Download Seller Agreement PDF for authenticated applicant
 */
export const getSellerAgreementPdf = async (req, res) => {
  const userId = req.user.id || req.user._id
  const application = await SellerApplication.findOne({ userId }).lean()
  if (!application) {
    throw new ApiError(404, 'No seller application found for this account')
  }
  const SellerKYC = (await import('../models/SellerKYC.js')).default
  const kyc = await SellerKYC.findOne({ userId }).lean()

  const ref = application.applicationReference || application._id.toString()
  const filename = `StyleStreet_Seller_Agreement_${ref}.pdf`
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)

  await generateSellerAgreementPdf(application, kyc, res)
}

/**
 * Admin: Get / Download Seller Agreement PDF for an application by ID
 */
export const getAdminSellerAgreementPdf = async (req, res) => {
  const { id } = req.params
  const application = await SellerApplication.findById(id).lean()
  if (!application) {
    throw new ApiError(404, 'Seller application not found')
  }
  const SellerKYC = (await import('../models/SellerKYC.js')).default
  const kyc = await SellerKYC.findOne({
    $or: [{ applicationId: application._id }, { userId: application.userId }]
  }).lean()

  const ref = application.applicationReference || application._id.toString()
  const filename = `StyleStreet_Seller_Agreement_${ref}.pdf`
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)

  await generateSellerAgreementPdf(application, kyc, res)
}

// Aliases for unified naming convention
export const submitApplication = submitSellerApplication
export const reviewApplication = reviewSellerApplication

