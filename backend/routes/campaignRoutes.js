import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken, adminOnly } from '../middleware/authMiddleware.js';
import { getActiveCampaigns, trackCampaignEvent, emergencyStopCampaigns } from '../controllers/campaignController.js';

const router = express.Router();

// Public campaign endpoints
router.get('/active', asyncHandler(getActiveCampaigns));
router.post('/emergency-stop', verifyToken, adminOnly, asyncHandler(emergencyStopCampaigns));
router.post('/:id/track', asyncHandler(trackCampaignEvent));

export default router;
