import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getShopProfile, getShopProducts } from '../controllers/shopController.js'

const router = express.Router()

router.get('/:slug', asyncHandler(getShopProfile))
router.get('/:slug/products', asyncHandler(getShopProducts))

export default router
