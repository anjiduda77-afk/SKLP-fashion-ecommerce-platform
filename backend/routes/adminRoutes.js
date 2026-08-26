import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import verifyRole from '../middleware/verifyRole.js'
import { uploadProductImages, handleMulterError } from '../middleware/uploadMiddleware.js'
import * as adminController from '../controllers/adminController.js'

const router = express.Router()

router.use(verifyToken)
router.use(verifyRole(['admin']))

// Dashboard
router.get('/dashboard', asyncHandler(adminController.getDashboardMetrics))

// Products
router.get('/products', asyncHandler(adminController.getAllProducts))
router.post('/products', uploadProductImages, handleMulterError, asyncHandler(adminController.createProduct))
router.put('/products/:id', uploadProductImages, handleMulterError, asyncHandler(adminController.updateProduct))
router.delete('/products/:id', asyncHandler(adminController.deleteProduct))
router.put('/products/bulk/update', asyncHandler(adminController.bulkUpdateProducts))

// Orders
router.get('/orders', asyncHandler(adminController.getAllOrders))
router.put('/orders/:id/status', asyncHandler(adminController.updateOrderStatus))
router.get('/orders/:id', asyncHandler(adminController.getOrderById))

// Users
router.get('/users', asyncHandler(adminController.getAllUsers))
router.post('/users', asyncHandler(adminController.createUserByAdmin))
router.put('/users/:id/role', asyncHandler(adminController.changeUserRole))
router.delete('/users/:id', asyncHandler(adminController.deleteUserByAdmin))

// Sellers & Applications
router.get('/sellers', asyncHandler(adminController.getAllSellers))
router.put('/sellers/:id/verify', asyncHandler(adminController.verifySeller))

// Seller Applications & Anti-Cheating Review
router.get('/seller-applications', asyncHandler(async (req, res) => {
  const { getAdminSellerApplications } = await import('../controllers/sellerApplicationController.js')
  return getAdminSellerApplications(req, res)
}))
router.put('/seller-applications/:id/review', asyncHandler(async (req, res) => {
  const { reviewSellerApplication } = await import('../controllers/sellerApplicationController.js')
  return reviewSellerApplication(req, res)
}))

// Marketplace Revenue & Settlements
router.get('/marketplace-revenue', asyncHandler(async (req, res) => {
  const { getAdminMarketplaceRevenue } = await import('../controllers/settlementController.js')
  return getAdminMarketplaceRevenue(req, res)
}))
router.put('/settlements/:id/pay', asyncHandler(async (req, res) => {
  const { markSettlementPaid } = await import('../controllers/settlementController.js')
  return markSettlementPaid(req, res)
}))

// Coupons
router.get('/coupons', asyncHandler(adminController.getCoupons))
router.post('/coupons', asyncHandler(adminController.createCoupon))
router.put('/coupons/:id', asyncHandler(adminController.updateCoupon))
router.delete('/coupons/:id', asyncHandler(adminController.deleteCoupon))

// Returns
router.get('/returns', asyncHandler(adminController.getReturnRequests))
router.put('/returns/:id/status', asyncHandler(adminController.updateReturnStatus))

// Banners
router.get('/banners', asyncHandler(adminController.getBanners))
router.post('/banners', asyncHandler(adminController.createBanner))
router.put('/banners/:id', asyncHandler(adminController.updateBanner))
router.delete('/banners/:id', asyncHandler(adminController.deleteBanner))

// Notifications
router.get('/notifications', asyncHandler(adminController.getNotifications))
router.post('/notifications', asyncHandler(adminController.createNotification))

// Product Reviews Moderation
router.get('/reviews', asyncHandler(adminController.getAdminReviews))
router.put('/reviews/:id/status', asyncHandler(adminController.updateReviewModerationStatus))

export default router

