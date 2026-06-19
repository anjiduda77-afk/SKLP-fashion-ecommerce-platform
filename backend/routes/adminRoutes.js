import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken, adminOnly } from '../middleware/authMiddleware.js'
import { uploadProductImages, handleMulterError } from '../middleware/uploadMiddleware.js'
import * as adminController from '../controllers/adminController.js'

const router = express.Router()

router.use(verifyToken)
router.use(adminOnly)

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
router.put('/users/:id/role', asyncHandler(adminController.changeUserRole))

// Sellers
router.get('/sellers', asyncHandler(adminController.getAllSellers))
router.put('/sellers/:id/verify', asyncHandler(adminController.verifySeller))

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

export default router
