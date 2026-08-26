import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken, optionalAuth, sellerOrAdmin } from '../middleware/authMiddleware.js'
import * as productController from '../controllers/productController.js'
import * as reviewController from '../controllers/reviewController.js'
import { getProductOffers } from '../controllers/sellerOfferController.js'

const router = express.Router()

// Catalog & Search Routes
router.get('/', asyncHandler(productController.getProducts))
router.get('/featured', asyncHandler(productController.getFeaturedProducts))
router.get('/trending', asyncHandler(productController.getTrendingProducts))
router.get('/search', asyncHandler(productController.searchProducts))
router.get('/ai/recommendations', asyncHandler(productController.getAIRecommendations))
router.get('/:productId/offers', asyncHandler(getProductOffers))

// Single Product Details & Associations
router.get('/:id', asyncHandler(productController.getProductById))
router.get('/:id/related', asyncHandler(productController.getRelatedProducts))
router.get('/:id/similar', asyncHandler(productController.getSimilarProducts))

// ================= Product Reviews API =================
router.get('/:id/reviews', optionalAuth, asyncHandler(reviewController.getProductReviews))
router.get('/:id/reviews/eligibility', verifyToken, asyncHandler(reviewController.checkReviewEligibility))
router.post('/:id/reviews', verifyToken, asyncHandler(reviewController.createOrUpdateReview))
router.put('/:id/reviews/:reviewId', verifyToken, asyncHandler(reviewController.createOrUpdateReview))
router.delete('/:id/reviews/:reviewId', verifyToken, asyncHandler(reviewController.deleteReview))
router.post('/:id/reviews/:reviewId/helpful', verifyToken, asyncHandler(reviewController.voteReviewHelpful))
router.post('/:id/reviews/:reviewId/reply', verifyToken, sellerOrAdmin, asyncHandler(reviewController.replyToReview))

export default router
