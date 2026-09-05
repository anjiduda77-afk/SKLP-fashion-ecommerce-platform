import SellerSettlement from '../models/SellerSettlement.js'
import Subscription from '../models/Subscription.js'
import Order from '../models/Order.js'
import { ApiError } from '../middleware/errorHandler.js'
import { getOrCreateSellerProfile } from '../utils/sellerHelper.js'

/**
 * Helper: Auto-release matured settlements past their hold period
 */
export const autoReleaseSettlements = async (filter = {}) => {
  try {
    const query = {
      ...filter,
      status: 'PENDING',
      holdUntil: { $lte: new Date() }
    }
    const result = await SellerSettlement.updateMany(query, {
      $set: { status: 'AVAILABLE' }
    })
    return result.modifiedCount || 0
  } catch (err) {
    console.warn('[SETTLEMENT] Auto-release error:', err.message)
    return 0
  }
}

/**
 * Seller: Get payout ledger and earnings breakdown
 */
export const getSellerSettlements = async (req, res) => {
  const seller = await getOrCreateSellerProfile(req.user.id)
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found')
  }

  // 1. Auto-release matured settlements for this seller
  await autoReleaseSettlements({ sellerId: seller._id })

  const { status, page = 1, limit = 20 } = req.query
  const query = { sellerId: seller._id }
  if (status && status !== 'ALL') query.status = status

  const settlements = await SellerSettlement.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean()

  const total = await SellerSettlement.countDocuments(query)

  // Aggregated totals across all statuses for this seller
  const allSettlements = await SellerSettlement.find({ sellerId: seller._id }).lean()
  const pendingAmount = allSettlements.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + (s.sellerPayout || 0), 0)
  const availableAmount = allSettlements.filter(s => s.status === 'AVAILABLE').reduce((sum, s) => sum + (s.sellerPayout || 0), 0)
  const processingAmount = allSettlements.filter(s => s.status === 'PROCESSING').reduce((sum, s) => sum + (s.sellerPayout || 0), 0)
  const paidAmount = allSettlements.filter(s => s.status === 'PAID').reduce((sum, s) => sum + (s.sellerPayout || 0), 0)
  const heldAmount = allSettlements.filter(s => s.status === 'HELD').reduce((sum, s) => sum + (s.sellerPayout || 0), 0)
  const totalCommission = allSettlements.reduce((sum, s) => sum + (s.platformCommission || 0), 0)
  const totalEligibleSales = allSettlements.reduce((sum, s) => sum + (s.eligibleAmount || 0), 0)

  // Calculate next payout estimated date (e.g. within 2 business days)
  const nextPayoutDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

  const isBankConfigured = Boolean(
    seller.bankDetails?.accountNumber && 
    seller.bankDetails?.ifscCode && 
    seller.bankDetails?.accountHolder
  )

  res.status(200).json({
    success: true,
    summary: {
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      availableAmount: Math.round(availableAmount * 100) / 100,
      processingAmount: Math.round(processingAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      heldAmount: Math.round(heldAmount * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      totalEligibleSales: Math.round(totalEligibleSales * 100) / 100,
      totalRecords: allSettlements.length,
      nextPayoutDate,
      bankDetails: seller.bankDetails,
      isBankConfigured
    },
    settlements,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 1
    }
  })
}

/**
 * Seller: Request payout for all available settlement funds
 */
export const requestSellerPayout = async (req, res) => {
  const seller = await getOrCreateSellerProfile(req.user.id)
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found')
  }

  // Ensure matured settlements are released first
  await autoReleaseSettlements({ sellerId: seller._id })

  if (!seller.bankDetails?.accountNumber || !seller.bankDetails?.ifscCode) {
    throw new ApiError(400, 'Please complete and save your bank account details before requesting a payout')
  }

  const availableSettlements = await SellerSettlement.find({
    sellerId: seller._id,
    status: 'AVAILABLE'
  })

  if (!availableSettlements.length) {
    throw new ApiError(400, 'No available settlement funds ready for payout at this time')
  }

  const payoutAmount = availableSettlements.reduce((sum, s) => sum + s.sellerPayout, 0)
  const settlementIds = availableSettlements.map(s => s._id)

  await SellerSettlement.updateMany(
    { _id: { $in: settlementIds } },
    { 
      $set: { 
        status: 'PROCESSING', 
        notes: `Payout request created on ${new Date().toISOString().split('T')[0]}` 
      } 
    }
  )

  res.status(200).json({
    success: true,
    message: `Payout of ₹${payoutAmount.toLocaleString('en-IN')} requested successfully! It will be deposited to your bank account within 24-48 business hours.`,
    payoutAmount,
    settlementsCount: availableSettlements.length
  })
}

/**
 * Admin: Get comprehensive marketplace revenue & settlements overview
 */
export const getAdminMarketplaceRevenue = async (req, res) => {
  // Auto-release any matured settlements across all sellers
  await autoReleaseSettlements({})

  // 1. Total Customer Payments & Order Sales
  const orders = await Order.find({ paymentStatus: { $in: ['completed', 'pending'] } }).lean()
  const totalCustomerPayments = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const totalGrossSubtotal = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
  const totalCustomerPlatformFees = orders.reduce((sum, o) => sum + (o.platformFee || 0), 0)
  const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0)

  // 2. Marketplace Settlements & Seller Commissions
  const settlements = await SellerSettlement.find().populate('sellerId', 'shopName bankDetails').lean()
  const totalSellerEligibleSales = settlements.reduce((sum, s) => sum + s.eligibleAmount, 0)
  const totalSellerCommission = settlements.reduce((sum, s) => sum + s.platformCommission, 0)
  const totalSellerPayoutsDue = settlements.filter(s => ['PENDING', 'AVAILABLE'].includes(s.status)).reduce((sum, s) => sum + s.sellerPayout, 0)
  const totalSellerPayoutsPaid = settlements.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.sellerPayout, 0)

  // 3. Subscription Revenue
  const subscriptions = await Subscription.find({ status: { $in: ['ACTIVE', 'TRIAL'] } }).lean()
  const totalSubscriptionRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0)

  // 4. Net Platform Revenue Calculation
  // Platform Commission (5% from sellers) + Customer Platform Fee (5%) + Seller Subscriptions
  const netPlatformRevenue = totalSellerCommission + totalCustomerPlatformFees + totalSubscriptionRevenue

  res.status(200).json({
    success: true,
    revenue: {
      totalCustomerPayments,
      totalGrossSubtotal,
      totalCustomerPlatformFees,
      totalDeliveryFees,
      totalSellerEligibleSales,
      platformCommissionEarned: totalSellerCommission,
      totalSubscriptionRevenue,
      netPlatformRevenue,
      payouts: {
        pendingOrAvailable: totalSellerPayoutsDue,
        totalPaid: totalSellerPayoutsPaid
      }
    },
    recentSettlements: settlements.slice(0, 15)
  })
}

/**
 * Admin: Mark settlement as Paid
 */
export const markSettlementPaid = async (req, res) => {
  const { id } = req.params
  const { payoutReference, notes } = req.body

  const settlement = await SellerSettlement.findById(id)
  if (!settlement) {
    throw new ApiError(404, 'Settlement record not found')
  }

  settlement.status = 'PAID'
  settlement.paidAt = new Date()
  if (payoutReference) settlement.payoutReference = payoutReference
  if (notes) settlement.notes = notes

  await settlement.save()

  res.status(200).json({
    success: true,
    message: 'Settlement marked as paid successfully',
    settlement
  })
}
