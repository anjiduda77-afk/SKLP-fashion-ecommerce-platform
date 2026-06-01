import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import * as cartController from '../controllers/cartController.js'

const router = express.Router()

router.use(verifyToken)
router.get('/', asyncHandler(cartController.getCart))
router.post('/items', asyncHandler(cartController.addItemToCart))
router.put('/items/:itemId', asyncHandler(cartController.updateCartItem))
router.delete('/items/:itemId', asyncHandler(cartController.removeCartItem))
router.delete('/', asyncHandler(cartController.clearCart))
router.post('/coupon', asyncHandler(cartController.applyCoupon))
router.delete('/coupon', asyncHandler(cartController.removeCoupon))

export default router
