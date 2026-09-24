import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import verifyRole from '../middleware/verifyRole.js'
import { uploadProductImages, handleMulterError } from '../middleware/uploadMiddleware.js'
import * as sellerController from '../controllers/sellerController.js'
import * as sellerApplicationController from '../controllers/sellerApplicationController.js'
import * as sellerOfferController from '../controllers/sellerOfferController.js'
import * as settlementController from '../controllers/settlementController.js'
import * as subscriptionController from '../controllers/subscriptionController.js'
import * as receiptController from '../controllers/receiptController.js'
import * as sellerKycController from '../controllers/sellerKycController.js'
import { kycRateLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// All routes require login
router.use(verifyToken)

// ── 1. Seller Onboarding / Application & KYC (Any Authenticated Applicant) ──
router.get('/check-shop-name', asyncHandler(sellerApplicationController.checkShopNameAvailability))
router.post('/apply', asyncHandler(sellerApplicationController.submitSellerApplication))
router.get('/application/status', asyncHandler(sellerApplicationController.getMyApplicationStatus))

// Genuine Multi-Point KYC Verification
router.get('/kyc/status', asyncHandler(sellerKycController.getMyKycStatus))
router.post('/kyc/phone/verify', kycRateLimiter, asyncHandler(sellerKycController.verifyPhoneKyc))
router.post('/kyc/aadhaar/start', kycRateLimiter, asyncHandler(sellerKycController.startAadhaarKyc))
router.post('/kyc/aadhaar/verify', kycRateLimiter, asyncHandler(sellerKycController.completeAadhaarKyc))
router.post('/kyc/pan/verify', kycRateLimiter, asyncHandler(sellerKycController.verifyPanKyc))
router.post('/kyc/bank/verify', kycRateLimiter, asyncHandler(sellerKycController.verifyBankKyc))

// ── 2. Seller-Only Protected Routes ──────────────────────────────────────────
router.use(verifyRole(['seller', 'admin']))

// Dashboard & Profile
router.get('/dashboard', asyncHandler(sellerController.getSellerDashboard))
router.get('/profile', asyncHandler(sellerController.getSellerProfile))
router.put('/profile', asyncHandler(sellerController.updateSellerProfile))
router.get('/delivery-settings', asyncHandler(sellerController.getSellerDeliverySettings))
router.put('/delivery-settings', asyncHandler(sellerController.updateSellerDeliverySettings))

// Products & Offers
router.get('/products', asyncHandler(sellerController.getSellerProducts))
router.post('/products', uploadProductImages, handleMulterError, asyncHandler(sellerController.createSellerProduct))
router.put('/products/:id', uploadProductImages, handleMulterError, asyncHandler(sellerController.updateSellerProduct))
router.delete('/products/:id', asyncHandler(sellerController.deleteSellerProduct))
router.delete('/products/:id/images/:imageIndex', asyncHandler(sellerController.deleteProductImage))

// Multi-Seller Product Offers
router.get('/offers', asyncHandler(sellerOfferController.getMyOffers))
router.post('/offers', asyncHandler(sellerOfferController.createOrUpdateSellerOffer))

// Orders & Suborders Fulfillment
router.get('/orders', asyncHandler(sellerController.getSellerOrders))
router.get('/orders/:orderId/receipt', asyncHandler(receiptController.getSellerOrderReceipt))
router.put('/orders/:id/dispatch', asyncHandler(sellerController.dispatchOrder))

// Settlement & Payout Ledger
router.get('/settlements', asyncHandler(settlementController.getSellerSettlements))
router.post('/settlements/payout', asyncHandler(settlementController.requestSellerPayout))

// Subscription Plans & 30-Day Trial
router.get('/subscription', asyncHandler(subscriptionController.getSubscriptionInfo))
router.post('/subscription/select-plan', asyncHandler(subscriptionController.selectSubscriptionPlan))

export default router
