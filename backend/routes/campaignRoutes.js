import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getActiveCampaigns, trackCampaignEvent } from '../controllers/campaignController.js';

const router = express.Router();

// Public campaign endpoints
router.get('/active', asyncHandler(getActiveCampaigns));
router.post('/:id/track', asyncHandler(trackCampaignEvent));

export default router;
