import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} from '../controllers/userController.js';

const router = express.Router();

// Apply auth protection to all wishlist endpoints
router.use(verifyToken);

router.route('/')
  .get(asyncHandler(getWishlist))
  .post(asyncHandler(addToWishlist))
  .delete(asyncHandler(clearWishlist));

router.route('/:productId')
  .delete(asyncHandler(removeFromWishlist));

export default router;
