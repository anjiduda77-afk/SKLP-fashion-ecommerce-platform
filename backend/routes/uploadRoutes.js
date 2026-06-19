import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  uploadProductImages,
  uploadAvatar,
  handleMulterError,
} from '../middleware/uploadMiddleware.js';
import {
  uploadProductImagesHandler,
  uploadAvatarHandler,
  deleteImageHandler,
} from '../controllers/uploadController.js';

const router = express.Router();

// All upload routes require authentication
router.use(verifyToken);

// Upload multiple product images (up to 5)
router.post(
  '/images',
  uploadProductImages,
  handleMulterError,
  asyncHandler(uploadProductImagesHandler)
);

// Upload single avatar
router.post(
  '/avatar',
  uploadAvatar,
  handleMulterError,
  asyncHandler(uploadAvatarHandler)
);

// Delete an image by publicId
router.delete('/:publicId', asyncHandler(deleteImageHandler));

export default router;
