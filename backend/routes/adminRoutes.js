import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken, adminOnly } from '../middleware/authMiddleware.js'
import * as adminController from '../controllers/adminController.js'

const router = express.Router()

router.use(verifyToken)
router.use(adminOnly)

router.get('/dashboard', asyncHandler(adminController.getDashboardMetrics))
router.get('/products', asyncHandler(adminController.getAllProducts))
router.post('/products', asyncHandler(adminController.createProduct))
router.put('/products/:id', asyncHandler(adminController.updateProduct))
router.delete('/products/:id', asyncHandler(adminController.deleteProduct))

router.get('/orders', asyncHandler(adminController.getAllOrders))
router.put('/orders/:id/status', asyncHandler(adminController.updateOrderStatus))
router.get('/orders/:id', asyncHandler(adminController.getOrderById))

router.get('/users', asyncHandler(adminController.getAllUsers))
router.put('/users/:id/role', asyncHandler(adminController.changeUserRole))

router.get('/coupons', asyncHandler(adminController.getCoupons))
router.post('/coupons', asyncHandler(adminController.createCoupon))
router.put('/coupons/:id', asyncHandler(adminController.updateCoupon))
router.delete('/coupons/:id', asyncHandler(adminController.deleteCoupon))

router.get('/returns', asyncHandler(adminController.getReturnRequests))
router.put('/returns/:id/status', asyncHandler(adminController.updateReturnStatus))

router.get('/banners', asyncHandler(adminController.getBanners))
router.post('/banners', asyncHandler(adminController.createBanner))
router.put('/banners/:id', asyncHandler(adminController.updateBanner))
router.delete('/banners/:id', asyncHandler(adminController.deleteBanner))

router.get('/notifications', asyncHandler(adminController.getNotifications))
router.post('/notifications', asyncHandler(adminController.createNotification))

export default router
