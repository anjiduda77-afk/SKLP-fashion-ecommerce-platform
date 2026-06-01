import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as productController from '../controllers/productController.js'

const router = express.Router()

router.get('/', asyncHandler(productController.getProducts))
router.get('/featured', asyncHandler(productController.getFeaturedProducts))
router.get('/trending', asyncHandler(productController.getTrendingProducts))
router.get('/search', asyncHandler(productController.searchProducts))
router.get('/ai/recommendations', asyncHandler(productController.getAIRecommendations))
router.get('/:id', asyncHandler(productController.getProductById))
router.get('/:id/related', asyncHandler(productController.getRelatedProducts))
router.get('/:id/similar', asyncHandler(productController.getSimilarProducts))
router.get('/:id/reviews', asyncHandler(productController.getProductReviews))

export default router
