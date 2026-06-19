import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken, sellerOnly } from '../middleware/authMiddleware.js';
import { uploadProductImages, handleMulterError } from '../middleware/uploadMiddleware.js';
import * as sellerController from '../controllers/sellerController.js';

const router = express.Router();

// All seller routes require authentication + seller role
router.use(verifyToken);
router.use(sellerOnly);

// Dashboard
router.get('/dashboard', asyncHandler(sellerController.getSellerDashboard));

// Products
router.get('/products', asyncHandler(sellerController.getSellerProducts));
router.post('/products', uploadProductImages, handleMulterError, asyncHandler(sellerController.createSellerProduct));
router.put('/products/:id', uploadProductImages, handleMulterError, asyncHandler(sellerController.updateSellerProduct));
router.delete('/products/:id', asyncHandler(sellerController.deleteSellerProduct));
router.delete('/products/:id/images/:imageIndex', asyncHandler(sellerController.deleteProductImage));

// Orders
router.get('/orders', asyncHandler(sellerController.getSellerOrders));
router.put('/orders/:id/dispatch', asyncHandler(sellerController.dispatchOrder));

// Profile
router.get('/profile', asyncHandler(sellerController.getSellerProfile));
router.put('/profile', asyncHandler(sellerController.updateSellerProfile));

export default router;
