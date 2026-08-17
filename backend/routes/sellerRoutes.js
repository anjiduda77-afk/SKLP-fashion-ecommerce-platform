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

const router = express.Router()

// All routes require login
router.use(verifyToken)

// ── 1. Seller Onboarding / Application (Any Authenticated Customer) ─────────
router.get('/check-shop-name', asyncHandler(sellerApplicationController.checkShopNameAvailability))
router.post('/apply', asyncHandler(sellerApplicationController.submitSellerApplication))
router.get('/application/status', asyncHandler(sellerApplicationController.getMyApplicationStatus))

// ── 2. Seller-Only Protected Routes ──────────────────────────────────────────
router.use(verifyRole(['seller', 'admin']))

// Dashboard & Profile
router.get('/dashboard', asyncHandler(sellerController.getSellerDashboard))
router.get('/profile', asyncHandler(sellerController.getSellerProfile))
router.put('/profile', asyncHandler(sellerController.updateSellerProfile))

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
router.put('/orders/:id/dispatch', asyncHandler(sellerController.dispatchOrder))

// Settlement & Payout Ledger
router.get('/settlements', asyncHandler(settlementController.getSellerSettlements))

// Subscription Plans & 30-Day Trial
router.get('/subscription', asyncHandler(subscriptionController.getSubscriptionInfo))
router.post('/subscription/select-plan', asyncHandler(subscriptionController.selectSubscriptionPlan))

export default router
