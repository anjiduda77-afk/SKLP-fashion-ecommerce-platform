import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import verifyRole from '../middleware/verifyRole.js'
import * as deliveryController from '../controllers/deliveryController.js'

const router = express.Router()

// All delivery routes require authentication and delivery role
router.use(verifyToken)
router.use(verifyRole(['delivery', 'deliveryPartner', 'deliverypartner']))

/**
 * Dashboard
 */
router.get('/dashboard', asyncHandler(deliveryController.getDashboard))

/**
 * Orders Management
 */
router.get('/orders', asyncHandler(deliveryController.getAssignedOrders))
router.put('/orders/:orderId/status', asyncHandler(deliveryController.updateOrderStatus))
router.post('/orders/:orderId/location', asyncHandler(deliveryController.updateDeliveryLocation))

/**
 * Earnings
 */
router.get('/earnings', asyncHandler(deliveryController.getEarnings))

/**
 * Analytics
 */
router.get('/analytics', asyncHandler(deliveryController.getAnalytics))

export default router
