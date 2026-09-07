import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { optionalAuth, verifyToken, adminOnly } from '../middleware/authMiddleware.js'
import {
  calculateFee,
  getDeliveryConfig,
  updateDeliveryConfig,
  toggleDeliveryPartner
} from '../controllers/deliveryFeeController.js'

const router = express.Router()

// ── Customer / Guest: calculate delivery fee for a given address
router.post('/calculate', optionalAuth, asyncHandler(calculateFee))

// ── Admin-only: read / update slab config & toggle partner delivery
router.get('/config', verifyToken, adminOnly, asyncHandler(getDeliveryConfig))
router.put('/config', verifyToken, adminOnly, asyncHandler(updateDeliveryConfig))
router.put('/config/partner-toggle', verifyToken, adminOnly, asyncHandler(toggleDeliveryPartner))

export default router
