import SellerSettlement from '../models/SellerSettlement.js'
import Seller from '../models/Seller.js'
import Subscription from '../models/Subscription.js'
import Order from '../models/Order.js'
import { ApiError } from '../middleware/errorHandler.js'

/**
 * Seller: Get payout ledger and earnings breakdown
 */
export const getSellerSettlements = async (req, res) => {
  const seller = await Seller.findOne({ userId: req.user.id })
  if (!seller) {
    throw new ApiError(403, 'Seller profile not found')
  }

  const { status, page = 1, limit = 20 } = req.query
  const query = { sellerId: seller._id }
  if (status && status !== 'ALL') query.status = status

  const settlements = await SellerSettlement.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean()

  const total = await SellerSettlement.countDocuments(query)

  // Aggregated totals
  const allSettlements = await SellerSettlement.find({ sellerId: seller._id }).lean()
  const pendingAmount = allSettlements.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + s.sellerPayout, 0)
  const availableAmount = allSettlements.filter(s => s.status === 'AVAILABLE').reduce((sum, s) => sum + s.sellerPayout, 0)
  const paidAmount = allSettlements.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.sellerPayout, 0)
  const totalCommission = allSettlements.reduce((sum, s) => sum + s.platformCommission, 0)

  res.status(200).json({
    success: true,
    summary: {
      pendingAmount,
      availableAmount,
      paidAmount,
      totalCommission,
      bankDetails: seller.bankDetails
    },
    settlements,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  })
}

/**
 * Admin: Get comprehensive marketplace revenue & settlements overview
 */
export const getAdminMarketplaceRevenue = async (req, res) => {
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
