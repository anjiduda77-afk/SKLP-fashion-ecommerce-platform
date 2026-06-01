import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken, ownerOrAdmin } from '../middleware/authMiddleware.js'
import * as orderController from '../controllers/orderController.js'

const router = express.Router()

router.use(verifyToken)
router.post('/', asyncHandler(orderController.createOrder))
router.get('/', asyncHandler(orderController.getOrders))
router.get('/:id', asyncHandler(orderController.getOrderById))
router.get('/:id/track', asyncHandler(orderController.trackOrder))
router.put('/:id/cancel', asyncHandler(orderController.cancelOrder))
router.post('/:id/return', asyncHandler(orderController.requestReturn))
router.get('/:id/return-status', asyncHandler(orderController.getReturnStatus))

export default router
