import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getBranding } from '../controllers/brandingController.js'

const router = express.Router()

// Public — any client can fetch branding data (logo URLs, brand colours)
router.get('/', asyncHandler(getBranding))

export default router
