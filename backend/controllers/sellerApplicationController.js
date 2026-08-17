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
  const userId = req.user.id
  const {
    applicantName,
    email,
    phone,
    shopName,
    businessType,
    businessAddress,
    panNumber,
    gstNumber,
    bankDetails,
    documents
  } = req.body

  if (!applicantName || !email || !phone || !shopName) {
    throw new ApiError(400, 'Please provide applicant name, email, phone, and shop name.')
  }

  const user = await User.findById(userId)
  if (!user) throw new ApiError(404, 'User not found')

  if (user.role === 'seller') {
    throw new ApiError(400, 'You already have an active seller account.')
  }

  // Check shop name availability
  const slug = slugify(shopName)
  const existingSeller = await Seller.findOne({
    $or: [{ shopSlug: slug }, { shopName: new RegExp(`^${shopName.trim()}$`, 'i') }],
    userId: { $ne: userId }
  })
  if (existingSeller) {
    throw new ApiError(400, 'Shop name is already registered by another merchant.')
  }

  // ── Anti-Cheating & Automated Risk Calculation ──────────────────────────────
  let riskScore = 0
  const riskFlags = []

  // Check 1: Duplicate phone / email on previous suspended/rejected applications
  const duplicateRejected = await SellerApplication.findOne({
    $or: [{ phone }, { email: email.toLowerCase() }],
    userId: { $ne: userId },
    status: { $in: ['REJECTED', 'SUSPENDED'] }
  })
  if (duplicateRejected) {
    riskScore += 45
    riskFlags.push('Phone or email was associated with a previously rejected/suspended seller application.')
  }

  // Check 2: Unverified customer phone
  if (!user.isPhoneVerified && user.phone !== phone) {
    riskScore += 20
    riskFlags.push('Applicant phone differs from verified account phone.')
  }

  // Check 3: Business documents completeness
  if (!documents || documents.length === 0) {
    riskScore += 25
    riskFlags.push('No identity or business verification documents attached.')
  }

  // Check 4: PAN number duplicate check
  if (panNumber) {
    const dupPan = await SellerApplication.findOne({
      panNumber: panNumber.toUpperCase(),
      userId: { $ne: userId },
      status: { $in: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW'] }
    })
    if (dupPan) {
      riskScore += 40
      riskFlags.push('PAN number is already associated with another seller account.')
    }
  }

  const riskLevel = riskScore >= 50 ? 'HIGH_RISK' : riskScore >= 20 ? 'MEDIUM_RISK' : 'LOW_RISK'

  // Create or update application
  let application = await SellerApplication.findOne({ userId })
  if (!application) {
    application = new SellerApplication({ userId })
  }

  application.applicantName = applicantName
  application.email = email.toLowerCase()
  application.phone = phone
  application.shopName = shopName.trim()
  application.businessType = businessType || 'individual'
  application.businessAddress = businessAddress || {}
  application.panNumber = panNumber ? panNumber.toUpperCase() : ''
  application.gstNumber = gstNumber ? gstNumber.toUpperCase() : ''
  application.bankDetails = bankDetails || {}
  if (documents && Array.isArray(documents)) {
    application.documents = documents
  }
  application.status = 'SUBMITTED'
  application.riskScore = riskScore
  application.riskLevel = riskLevel
  application.riskFlags = riskFlags

  application.auditLogs.push({
    action: 'APPLICATION_SUBMITTED',
    newStatus: 'SUBMITTED',
    reason: 'Applicant submitted seller registration details.',
    timestamp: new Date()
  })

  await application.save()

  res.status(200).json({
    success: true,
    message: 'Seller application submitted successfully. It is now under review.',
    application: {
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
  const adminId = req.user.id

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
      gstNumber: application.gstNumber,
      panNumber: application.panNumber,
      bankDetails: application.bankDetails,
      isVerified: true,
      verifiedAt: new Date()
    }
    await user.save()

    // 2. Create / Activate dedicated Seller record
    const slug = slugify(application.shopName)
    let seller = await Seller.findOne({ userId: user._id })
    if (!seller) {
      seller = new Seller({
        userId: user._id,
        shopName: application.shopName,
        shopSlug: slug,
        businessType: application.businessType,
        bankDetails: { ...application.bankDetails, isVerified: true },
        verificationStatus: 'verified',
        sellerStatus: 'active',
        subscriptionStatus: 'trial',
        currentPlan: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
    } else {
      seller.shopName = application.shopName
      seller.shopSlug = slug
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
      message: `Your shop "${application.shopName}" is now active with a 30-day Free Trial. Access your Seller Dashboard to start listing products.`,
      relatedEntity: { entityType: 'seller', entityId: seller._id }
    })
  } else if (action === 'REJECT') {
    application.status = 'REJECTED'
    application.adminNotes = notes || reason || 'Application rejected.'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()

    await Notification.create({
      userId: user._id,
      type: 'seller_rejected',
      title: 'Seller Application Status Update',
      message: `Your application for "${application.shopName}" could not be approved. Reason: ${reason || notes || 'Documentation requirements not met'}.`
    })
  } else if (action === 'REQUEST_INFO') {
    application.status = 'VERIFICATION_REQUIRED'
    application.adminNotes = notes || 'Additional documents or clarifications required.'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()

    await Notification.create({
      userId: user._id,
      type: 'seller_info_required',
      title: 'Additional Information Required for Seller Application',
      message: notes || 'Please update your business details or re-upload verification documents.'
    })
  } else if (action === 'SUSPEND') {
    application.status = 'SUSPENDED'
    const seller = await Seller.findOne({ userId: user._id })
    if (seller) {
      seller.sellerStatus = 'suspended'
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
