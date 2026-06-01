import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { verifyToken, ownerOrAdmin } from '../middleware/authMiddleware.js'
import * as userController from '../controllers/userController.js'

const router = express.Router()

router.get('/me', verifyToken, asyncHandler(userController.getProfile))
router.put('/profile', verifyToken, asyncHandler(userController.updateProfile))
router.put('/change-password', verifyToken, asyncHandler(userController.changePassword))
router.get('/addresses', verifyToken, asyncHandler(userController.getAddresses))
router.post('/addresses', verifyToken, asyncHandler(userController.addAddress))
router.put('/addresses/:addressId', verifyToken, asyncHandler(userController.updateAddress))
router.delete('/addresses/:addressId', verifyToken, asyncHandler(userController.deleteAddress))
router.get('/wishlist', verifyToken, asyncHandler(userController.getWishlist))
router.get('/recently-viewed', verifyToken, asyncHandler(userController.getRecentlyViewed))

export default router
