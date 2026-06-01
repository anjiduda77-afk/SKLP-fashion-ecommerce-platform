import express from 'express'
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as authController from '../controllers/authController.js'
import { verifyToken, verifyRefreshToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public Routes (Rate Limited)
router.post('/register', authRateLimiter, asyncHandler(authController.register))
router.post('/login', authRateLimiter, asyncHandler(authController.login))
router.post('/google-login', asyncHandler(authController.googleLogin))
router.post('/send-otp', otpRateLimiter, asyncHandler(authController.sendOTP))
router.post('/verify-otp', otpRateLimiter, asyncHandler(authController.verifyOTP))
router.post('/forgot-password', authRateLimiter, asyncHandler(authController.forgotPassword))
router.post('/reset-password', asyncHandler(authController.resetPassword))
router.post('/refresh-token', asyncHandler(authController.refreshToken))

// Protected Routes
router.post('/logout', verifyToken, asyncHandler(authController.logout))
router.get('/me', verifyToken, asyncHandler(authController.getCurrentUser))

export default router
