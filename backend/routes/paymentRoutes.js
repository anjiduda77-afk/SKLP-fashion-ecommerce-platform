import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { verifyRazorpayPayment, handleRazorpayWebhook } from '../controllers/paymentController.js'

const router = express.Router()

// Customer: verify Razorpay payment
router.post('/razorpay/verify', verifyToken, asyncHandler(verifyRazorpayPayment))

// Webhook listener
router.post('/webhook', asyncHandler(handleRazorpayWebhook))

export default router
