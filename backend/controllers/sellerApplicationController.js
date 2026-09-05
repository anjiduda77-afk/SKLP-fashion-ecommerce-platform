import SellerApplication from '../models/SellerApplication.js'
import Seller from '../models/Seller.js'
import User from '../models/User.js'
import Subscription from '../models/Subscription.js'
import Notification from '../models/Notification.js'
import { ApiError } from '../middleware/errorHandler.js'

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
 * Check if a shop name is valid and available
 */
export const checkShopNameAvailability = async (req, res) => {
  const { shopName } = req.query

  if (!shopName || shopName.trim().length < 3) {
    throw new ApiError(400, 'Shop name must be at least 3 characters long')
  }

  const normalized = shopName.trim().toLowerCase()
  const slug = slugify(shopName)

  // 1. Check prohibited keywords
  const isProhibited = PROHIBITED_KEYWORDS.some(kw => normalized.includes(kw))
  if (isProhibited) {
    return res.status(200).json({
      success: true,
      available: false,
      reason: 'This shop name contains trademarked or reserved keywords. Authorization required.'
    })
  }

  // 2. Check existing approved sellers
  const existingSeller = await Seller.findOne({
    $or: [{ shopSlug: slug }, { shopName: new RegExp(`^${shopName.trim()}$`, 'i') }]
  })

  // 3. Check pending approved applications
  const existingApp = await SellerApplication.findOne({
    shopName: new RegExp(`^${shopName.trim()}$`, 'i'),
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] }
  })

  const isAvailable = !existingSeller && !existingApp

  res.status(200).json({
    success: true,
    available: isAvailable,
    slug,
    reason: isAvailable ? 'Shop name is available!' : 'This shop name is already taken by another merchant.'
  })
}

/**
 * Submit / Update a Seller Application
 */
export const submitSellerApplication = async (req, res) => {
  const userId = req.user?.id || req.user?._id
  const {
    applicantName,
    email,
    phone,
    shopName,
    brandName,
    businessType,
    businessAddress,
    panNumber,
    gstNumber,
    bankDetails,
    documents
  } = req.body

  const user = await User.findById(userId)
  if (!user) throw new ApiError(404, 'User not found')

  if (user.role === 'seller') {
    throw new ApiError(400, 'You already have an active seller account.')
  }

  const resolvedName = (applicantName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Applicant').trim()
  const resolvedEmail = (email || user.email || '').toLowerCase().trim()
  const resolvedPhone = (phone || user.phone || '').trim()

  if (!resolvedName || !resolvedEmail || (!shopName && !brandName)) {
    throw new ApiError(400, 'Please provide applicant name, email, and brand/shop name.')
  }

  const effectiveBrand = (brandName || shopName).trim()
  const effectiveShop = (shopName || brandName).trim()
  const brandNormalized = effectiveBrand.toLowerCase().replace(/[^a-z0-9]/g, '')

  // ── Brand Name Uniqueness Check (Case-Insensitive Normalized) ──────────────
  const existingSellerBrand = await Seller.findOne({
    $or: [
      { brandNameNormalized: brandNormalized },
      { shopSlug: slugify(effectiveShop) }
    ],
    userId: { $ne: userId }
  })
  if (existingSellerBrand) {
    throw new ApiError(400, `The brand "${effectiveBrand}" is already registered by another merchant. Every brand must be unique.`)
  }

  // ── Anti-Cheating & Automated Risk Calculation ──────────────────────────────
  let riskScore = 0
  const riskFlags = []

  // Check 1: Duplicate or similar brand name in pending applications
  const existingPendingApp = await SellerApplication.findOne({
    brandNameNormalized: brandNormalized,
    userId: { $ne: userId },
    status: { $in: ['PENDING_REVIEW', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] }
  })
  if (existingPendingApp) {
    riskScore += 50
    riskFlags.push('DUPLICATE_RISK')
    riskFlags.push('Brand name matches another pending or active application.')
  }

  // Check 2: Duplicate phone / email on previous suspended/rejected applications
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

  // Check 3: Business documents completeness
  if (!documents || documents.length === 0) {
    riskScore += 25
    riskFlags.push('REVIEW_REQUIRED')
    riskFlags.push('No identity or business verification documents attached.')
  }

  // Check 4: PAN number duplicate check
  if (panNumber) {
    const dupPan = await SellerApplication.findOne({
      panNumber: panNumber.toUpperCase(),
      userId: { $ne: userId },
      status: { $in: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW'] }
    })
    if (dupPan) {
      riskScore += 40
      riskFlags.push('DUPLICATE_RISK')
      riskFlags.push('PAN number is already associated with another seller account.')
    }
  }

  // Check 5: GST number duplicate check
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
  const initialStatus = riskFlags.includes('DUPLICATE_RISK') ? 'REVIEW_REQUIRED' : 'PENDING_REVIEW'

  // Create or update application
  let application = await SellerApplication.findOne({ userId })
  if (!application) {
    application = new SellerApplication({ userId })
  }

  application.applicantName = resolvedName
  application.email = resolvedEmail
  application.phone = resolvedPhone || '0000000000'
  application.shopName = effectiveShop
  application.brandName = effectiveBrand
  application.brandNameNormalized = brandNormalized
  const normBusinessType = (businessType || 'individual').toLowerCase().trim()
  const validBusinessTypes = ['individual', 'proprietorship', 'partnership', 'pvt_ltd', 'other']
  application.businessType = validBusinessTypes.includes(normBusinessType) ? normBusinessType : 'individual'
  application.businessAddress = businessAddress || {}
  application.panNumber = panNumber ? panNumber.toUpperCase() : ''
  application.gstNumber = gstNumber ? gstNumber.toUpperCase() : ''
  application.bankDetails = bankDetails || {}
  if (documents && Array.isArray(documents)) {
    application.documents = documents
  }
  application.status = initialStatus
  application.riskScore = cappedRiskScore
  application.riskLevel = riskLevel
  application.riskFlags = [...new Set(riskFlags)]
  application.reviewFlags = application.riskFlags

  application.auditLogs.push({
    action: 'APPLICATION_SUBMITTED',
    newStatus: initialStatus,
    reason: 'Applicant submitted seller registration details.',
    timestamp: new Date()
  })

  await application.save()

  res.status(200).json({
    success: true,
    message: 'Seller application submitted successfully. It is now under review.',
    application: {
      _id: application._id,
      id: application._id,
      shopName: application.shopName,
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
  const { action, notes, reason } = req.body // action: 'APPROVE', 'REJECT', 'REQUEST_INFO', 'SUSPEND'
  const adminId = req.user?.id || req.user?._id

  const application = await SellerApplication.findById(id)
  if (!application) {
    throw new ApiError(404, 'Seller application not found')
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
        businessType: application.businessType,
        bankDetails: { ...application.bankDetails, isVerified: true },
        approvalStatus: 'APPROVED',
        verificationStatus: 'verified',
        sellerStatus: 'active',
        subscriptionStatus: 'trial',
        currentPlan: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
    } else {
      seller.shopName = application.shopName
      seller.shopSlug = slug
      seller.brandName = brandName
      seller.brandNameNormalized = brandNameNormalized
      seller.approvalStatus = 'APPROVED'
      seller.verificationStatus = 'verified'
      seller.sellerStatus = 'active'
    }
    await seller.save()

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
    await Notification.create({
      userId: user._id,
      type: 'seller_approved',
      title: '🎉 Congratulations! Your Seller Account is Approved',
      message: `Your brand "${brandName}" is now active with a 30-day Free Trial. Access your Seller Hub to start listing products.`,
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

    await Notification.create({
      userId: user._id,
      type: 'seller_rejected',
      title: 'Seller Application Status Update',
      message: `Your application for "${application.shopName}" could not be approved. Reason: ${reason || notes}.`
    })
  } else if (action === 'REQUEST_INFO' || action === 'REQUEST_CHANGES') {
    application.status = 'REVIEW_REQUIRED'
    application.adminNotes = notes || reason || 'Additional documents or clarifications required.'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()

    await Notification.create({
      userId: user._id,
      type: 'seller_info_required',
      title: 'Action Required: Seller Application Review',
      message: notes || reason || 'Please update your business details or re-upload verification documents.'
    })
  } else if (action === 'SUSPEND') {
    application.status = 'SUSPENDED'
    const seller = await Seller.findOne({ userId: user._id })
    if (seller) {
      seller.approvalStatus = 'SUSPENDED'
      seller.verificationStatus = 'suspended'
      seller.sellerStatus = 'suspended'
      await seller.save()
    }
  } else if (action === 'REACTIVATE') {
    application.status = 'APPROVED'
    const seller = await Seller.findOne({ userId: user._id })
    if (seller) {
      seller.approvalStatus = 'APPROVED'
      seller.verificationStatus = 'verified'
      seller.sellerStatus = 'active'
      await seller.save()
    }
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

// Aliases for unified naming convention
export const submitApplication = submitSellerApplication
export const reviewApplication = reviewSellerApplication
