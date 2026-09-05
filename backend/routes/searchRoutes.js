import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getSearchSuggestions, executeSearch, getSearchAnalytics } from '../controllers/searchController.js'
import { verifyToken, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/suggestions', asyncHandler(getSearchSuggestions))
router.get('/', asyncHandler(executeSearch))
router.get('/analytics', verifyToken, adminOnly, asyncHandler(getSearchAnalytics))

export default router
