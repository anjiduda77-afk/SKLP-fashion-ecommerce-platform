import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import MarketingAsset from '../models/MarketingAsset.js';
import MarketingAuditLog from '../models/MarketingAuditLog.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { ApiError } from '../middleware/errorHandler.js';

// Helper to log admin actions
const logMarketingAction = async (campaign, action, details, req) => {
  try {
    const adminUser = req?.user ? {
      id: req.user.id || req.user._id,
      name: `${req.user.firstName || 'Admin'} ${req.user.lastName || ''}`.trim(),
      email: req.user.email || 'admin@sklp.com'
    } : { name: 'System Admin', email: 'admin@sklp.com' };

    await MarketingAuditLog.create({
      campaignId: campaign?._id || null,
      campaignTitle: campaign?.title || 'Global Marketing',
      action,
      details,
      adminUser,
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '127.0.0.1',
      userAgent: req?.headers?.['user-agent'] || 'Unknown'
    });
  } catch (err) {
    console.warn('[MARKETING AUDIT LOG ERROR]:', err.message);
  }
};

/**
 * PUBLIC: Get active campaigns filtered by placement, device, and audience rules
 * Includes Stock-Aware product verification and Smart Fallback
 */
export const getActiveCampaigns = async (req, res) => {
  const { placement, device = 'all', audience = 'all', type, category } = req.query;
  const now = new Date();

  const query = {
    status: 'active',
    'schedule.startDate': { $lte: now },
    'schedule.endDate': { $gte: now }
  };

  if (type) query.type = type;
  if (placement && placement !== 'all') {
    query.$or = [
      { placement },
      { placement: 'custom' }
    ];
  }

  // Device targeting: matches 'all' or specific device
  if (device && device !== 'all') {
    query.device = { $in: ['all', device] };
  }

  // Audience targeting: matches 'all' or specific audience
  if (audience && audience !== 'all') {
    query.audience = { $in: ['all', audience] };
  }

  if (category) {
    query.$or = [
      { targetCategories: { $size: 0 } },
      { targetCategories: category }
    ];
  }

  let campaigns = await Campaign.find(query)
    .populate('promotedProducts.productId', 'name price discount images thumbnail isActive stock countInStock slug')
    .populate('coupon.couponId', 'code discountType discountValue minPurchaseAmount maxDiscountAmount isActive')
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  // Stock-awareness verification: sanitize promoted products
  const sanitizedCampaigns = [];

  for (const camp of campaigns) {
    // Check if limits exceeded
    if (camp.limits) {
      if (camp.limits.maxClicks && camp.limits.currentClicks >= camp.limits.maxClicks) continue;
      if (camp.limits.maxRedemptions && camp.limits.currentRedemptions >= camp.limits.maxRedemptions) continue;
      if (camp.limits.maxOrders && camp.limits.currentOrders >= camp.limits.maxOrders) continue;
    }

    // Sanitize promoted products: filter out inactive/out-of-stock items or provide fallback
    if (camp.promotedProducts && camp.promotedProducts.length > 0) {
      camp.promotedProducts = camp.promotedProducts.map(p => {
        const prod = p.productId;
        const isOutOfStock = !prod || prod.isActive === false || (prod.stock !== undefined && prod.stock <= 0) || (prod.countInStock !== undefined && prod.countInStock <= 0);
        return {
          productId: prod,
          isAvailable: !isOutOfStock,
          targetUrl: isOutOfStock ? (p.fallbackUrl || '/products') : `/products/${prod?._id || ''}`
        };
      });
    }

    sanitizedCampaigns.push(camp);
  }

  res.status(200).json({
    success: true,
    count: sanitizedCampaigns.length,
    campaigns: sanitizedCampaigns
  });
};

/**
 * PUBLIC: Track conversion funnel events (Impression, Click, Add to Cart, Purchase)
 */
export const trackCampaignEvent = async (req, res) => {
  const { id } = req.params;
  const { eventType, variantId = 'A', revenue = 0, orderId } = req.body;

  const validEvents = ['impression', 'click', 'product_view', 'add_to_cart', 'checkout', 'purchase'];
  if (!validEvents.includes(eventType)) {
    throw new ApiError(400, `Invalid event type. Must be one of: ${validEvents.join(', ')}`);
  }

  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  // Atomically increment metric counters
  const incObj = {};
  const vKey = variantId === 'B' ? 'variantB' : 'variantA';

  switch (eventType) {
    case 'impression':
      incObj['metrics.impressions'] = 1;
      incObj[`metrics.${vKey}.impressions`] = 1;
      break;
    case 'click':
      incObj['metrics.clicks'] = 1;
      incObj[`metrics.${vKey}.clicks`] = 1;
      incObj['limits.currentClicks'] = 1;
      break;
    case 'product_view':
      incObj['metrics.productViews'] = 1;
      incObj[`metrics.${vKey}.productViews`] = 1;
      break;
    case 'add_to_cart':
      incObj['metrics.addToCarts'] = 1;
      incObj[`metrics.${vKey}.addToCarts`] = 1;
      break;
    case 'checkout':
      incObj['metrics.checkouts'] = 1;
      incObj[`metrics.${vKey}.checkouts`] = 1;
      break;
    case 'purchase':
      incObj['metrics.purchases'] = 1;
      incObj[`metrics.${vKey}.purchases`] = 1;
      incObj['limits.currentOrders'] = 1;
      if (revenue > 0) {
        incObj['metrics.revenueGenerated'] = revenue;
        incObj[`metrics.${vKey}.revenueGenerated`] = revenue;
      }
      break;
  }

  const updatedCampaign = await Campaign.findByIdAndUpdate(id, { $inc: incObj }, { new: true });

  // Auto-pause if limits reached
  if (updatedCampaign.limits) {
    const { maxClicks, currentClicks, maxOrders, currentOrders } = updatedCampaign.limits;
    if ((maxClicks && currentClicks >= maxClicks) || (maxOrders && currentOrders >= maxOrders)) {
      updatedCampaign.status = 'completed';
      await updatedCampaign.save();
    }
  }

  res.status(200).json({
    success: true,
    message: `Event '${eventType}' recorded successfully`,
    campaignId: id
  });
};

/**
 * ADMIN: Get all campaigns with search, filtering, and stats
 */
export const getAdminCampaigns = async (req, res) => {
  const { search, status, type, placement, sort = '-createdAt', page = 1, limit = 20 } = req.query;

  const query = {};
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'coupon.couponCode': { $regex: search, $options: 'i' } }
    ];
  }
  if (status && status !== 'all') query.status = status;
  if (type && type !== 'all') query.type = type;
  if (placement && placement !== 'all') query.placement = placement;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Campaign.countDocuments(query);
  const campaigns = await Campaign.find(query)
    .populate('coupon.couponId', 'code discountType discountValue')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Summary counts for quick dashboard badges
  const stats = {
    total: await Campaign.countDocuments({}),
    active: await Campaign.countDocuments({ status: 'active' }),
    scheduled: await Campaign.countDocuments({ status: 'scheduled' }),
    paused: await Campaign.countDocuments({ status: 'paused' }),
    expired: await Campaign.countDocuments({ status: { $in: ['expired', 'completed'] } })
  };

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    stats,
    campaigns
  });
};

/**
 * ADMIN: Get single campaign by ID with full analytics & A/B comparison
 */
export const getAdminCampaignById = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id)
    .populate('promotedProducts.productId')
    .populate('coupon.couponId')
    .lean();

  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  // Compute A/B test comparison metrics
  let abAnalysis = null;
  if (campaign.isAbTest && campaign.metrics) {
    const a = campaign.metrics.variantA || {};
    const b = campaign.metrics.variantB || {};

    const ctrA = a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(2) : '0.00';
    const ctrB = b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(2) : '0.00';

    const crA = a.clicks > 0 ? ((a.purchases / a.clicks) * 100).toFixed(2) : '0.00';
    const crB = b.clicks > 0 ? ((b.purchases / b.clicks) * 100).toFixed(2) : '0.00';

    const winner = parseFloat(crA) > parseFloat(crB) ? 'Variant A' : parseFloat(crB) > parseFloat(crA) ? 'Variant B' : 'Tie / Insufficient Data';

    abAnalysis = {
      variantA: { ...a, ctr: `${ctrA}%`, conversionRate: `${crA}%` },
      variantB: { ...b, ctr: `${ctrB}%`, conversionRate: `${crB}%` },
      leadingVariant: winner
    };
  }

  res.status(200).json({
    success: true,
    campaign,
    abAnalysis
  });
};

/**
 * ADMIN: Create new marketing campaign
 */
export const createCampaign = async (req, res) => {
  const {
    title, description, type, placement, customRoutePattern, targetCategories,
    audience, device, coupon, frequency, priority, schedule, limits,
    promotedProducts, isAbTest, variants
  } = req.body;

  if (!title) throw new ApiError(400, 'Campaign title is required');
  if (!type) throw new ApiError(400, 'Campaign type is required');
  if (!schedule?.endDate) throw new ApiError(400, 'Campaign end date is required');

  // If coupon code provided, link to coupon model
  let resolvedCoupon = { enabled: false };
  if (coupon?.enabled && coupon?.couponCode) {
    const existingCoupon = await Coupon.findOne({ code: coupon.couponCode.toUpperCase() });
    resolvedCoupon = {
      enabled: true,
      couponId: existingCoupon?._id || null,
      couponCode: coupon.couponCode.toUpperCase(),
      autoApply: Boolean(coupon.autoApply)
    };
  }

  // Ensure default variant exists
  const initialVariants = (variants && variants.length > 0) ? variants : [{
    variantId: 'A',
    name: 'Default Variant',
    weight: 100,
    headline: title,
    ctaText: 'Explore Now',
    ctaLink: '/products',
    ctaStyle: 'gold'
  }];

  const campaign = await Campaign.create({
    title,
    description,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    type,
    placement: placement || 'homepage',
    customRoutePattern,
    targetCategories: targetCategories || [],
    audience: audience || 'all',
    device: device || 'all',
    coupon: resolvedCoupon,
    frequency: frequency || { type: 'always', value: 1 },
    priority: priority || 10,
    schedule: {
      startDate: schedule.startDate || new Date(),
      endDate: schedule.endDate,
      timezone: schedule.timezone || 'Asia/Kolkata'
    },
    limits: limits || {},
    promotedProducts: promotedProducts || [],
    isAbTest: Boolean(isAbTest),
    variants: initialVariants,
    createdBy: req.user.id,
    updatedBy: req.user.id
  });

  await logMarketingAction(campaign, 'created', { title, type, placement }, req);

  res.status(201).json({
    success: true,
    message: 'Campaign created successfully',
    campaign
  });
};

/**
 * ADMIN: Update marketing campaign
 */
export const updateCampaign = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found');

  const allowedUpdates = [
    'title', 'description', 'type', 'placement', 'customRoutePattern',
    'targetCategories', 'audience', 'device', 'coupon', 'frequency',
    'priority', 'schedule', 'status', 'limits', 'promotedProducts',
    'isAbTest', 'variants'
  ];

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      campaign[field] = req.body[field];
    }
  });

  campaign.updatedBy = req.user.id;
  await campaign.save();

  await logMarketingAction(campaign, 'edited', req.body, req);

  res.status(200).json({
    success: true,
    message: 'Campaign updated successfully',
    campaign
  });
};

/**
 * ADMIN: Delete campaign
 */
export const deleteCampaign = async (req, res) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found');

  await logMarketingAction(campaign, 'deleted', { id: req.params.id, title: campaign.title }, req);

  res.status(200).json({
    success: true,
    message: 'Campaign deleted successfully'
  });
};

/**
 * ADMIN: 1-Click Clone Campaign
 */
export const cloneCampaign = async (req, res) => {
  const source = await Campaign.findById(req.params.id).lean();
  if (!source) throw new ApiError(404, 'Source campaign not found');

  delete source._id;
  delete source.createdAt;
  delete source.updatedAt;

  source.title = `${source.title} (Copy)`;
  source.slug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;
  source.status = 'draft';
  // Reset metrics
  source.metrics = {
    impressions: 0, clicks: 0, productViews: 0, addToCarts: 0,
    checkouts: 0, purchases: 0, revenueGenerated: 0,
    variantA: { impressions: 0, clicks: 0, productViews: 0, addToCarts: 0, checkouts: 0, purchases: 0, revenueGenerated: 0 },
    variantB: { impressions: 0, clicks: 0, productViews: 0, addToCarts: 0, checkouts: 0, purchases: 0, revenueGenerated: 0 }
  };
  if (source.limits) {
    source.limits.currentClicks = 0;
    source.limits.currentRedemptions = 0;
    source.limits.currentOrders = 0;
  }
  source.createdBy = req.user.id;
  source.updatedBy = req.user.id;

  const cloned = await Campaign.create(source);
  await logMarketingAction(cloned, 'cloned', { originalId: req.params.id }, req);

  res.status(201).json({
    success: true,
    message: 'Campaign cloned successfully as draft',
    campaign: cloned
  });
};

/**
 * ADMIN: Instant Status Toggle (Publish Now / Pause Now)
 */
export const toggleCampaignStatus = async (req, res) => {
  const { status } = req.body;
  if (!['active', 'paused', 'draft'].includes(status)) {
    throw new ApiError(400, 'Status must be active, paused, or draft');
  }

  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found');

  const oldStatus = campaign.status;
  campaign.status = status;
  campaign.updatedBy = req.user.id;
  await campaign.save();

  const actionName = status === 'active' ? 'published' : 'paused';
  await logMarketingAction(campaign, actionName, { from: oldStatus, to: status }, req);

  res.status(200).json({
    success: true,
    message: `Campaign ${status === 'active' ? 'published' : 'paused'} successfully`,
    campaign
  });
};

/**
 * ADMIN: Emergency Control — Stop All Active Promotions (Kill-Switch)
 */
export const emergencyStopAll = async (req, res) => {
  const result = await Campaign.updateMany(
    { status: { $in: ['active', 'scheduled'] } },
    { $set: { status: 'paused', updatedBy: req.user.id } }
  );

  await logMarketingAction(null, 'emergency_stop_all', { pausedCount: result.modifiedCount }, req);

  res.status(200).json({
    success: true,
    message: `Emergency Killswitch activated. ${result.modifiedCount} active promotion(s) paused immediately.`,
    pausedCount: result.modifiedCount
  });
};

/**
 * ADMIN: Campaign Calendar View
 */
export const getCampaignCalendar = async (req, res) => {
  const campaigns = await Campaign.find({})
    .select('title type placement status schedule priority isAbTest')
    .sort({ 'schedule.startDate': 1 })
    .lean();

  const now = new Date();
  const calendarData = {
    live: [],
    scheduled: [],
    startingSoon: [], // Starting within 48h
    endingSoon: [],   // Ending within 48h
    expired: [],
    paused: [],
    draft: []
  };

  campaigns.forEach(c => {
    const start = new Date(c.schedule.startDate);
    const end = new Date(c.schedule.endDate);
    const diffStartHours = (start - now) / (1000 * 60 * 60);
    const diffEndHours = (end - now) / (1000 * 60 * 60);

    if (c.status === 'draft') {
      calendarData.draft.push(c);
    } else if (c.status === 'paused') {
      calendarData.paused.push(c);
    } else if (end < now) {
      calendarData.expired.push(c);
    } else if (start <= now && end >= now) {
      calendarData.live.push(c);
      if (diffEndHours <= 48 && diffEndHours > 0) {
        calendarData.endingSoon.push(c);
      }
    } else if (start > now) {
      calendarData.scheduled.push(c);
      if (diffStartHours <= 48 && diffStartHours > 0) {
        calendarData.startingSoon.push(c);
      }
    }
  });

  res.status(200).json({
    success: true,
    calendar: calendarData,
    totalCampaigns: campaigns.length
  });
};

/**
 * ADMIN: Aggregate Conversion Funnel Analytics
 */
export const getFunnelAnalytics = async (req, res) => {
  const campaigns = await Campaign.find({}).select('title type metrics isAbTest status').lean();

  const globalFunnel = {
    impressions: 0,
    clicks: 0,
    productViews: 0,
    addToCarts: 0,
    checkouts: 0,
    purchases: 0,
    totalRevenue: 0
  };

  const campaignFunnels = campaigns.map(c => {
    const m = c.metrics || {};
    globalFunnel.impressions += m.impressions || 0;
    globalFunnel.clicks += m.clicks || 0;
    globalFunnel.productViews += m.productViews || 0;
    globalFunnel.addToCarts += m.addToCarts || 0;
    globalFunnel.checkouts += m.checkouts || 0;
    globalFunnel.purchases += m.purchases || 0;
    globalFunnel.totalRevenue += m.revenueGenerated || 0;

    const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : '0.00';
    const clickToCart = m.clicks > 0 ? ((m.addToCarts / m.clicks) * 100).toFixed(2) : '0.00';
    const cartToPurchase = m.addToCarts > 0 ? ((m.purchases / m.addToCarts) * 100).toFixed(2) : '0.00';
    const overallConversion = m.impressions > 0 ? ((m.purchases / m.impressions) * 100).toFixed(2) : '0.00';

    return {
      id: c._id,
      title: c.title,
      type: c.type,
      status: c.status,
      metrics: m,
      rates: { ctr: `${ctr}%`, clickToCart: `${clickToCart}%`, cartToPurchase: `${cartToPurchase}%`, overallConversion: `${overallConversion}%` }
    };
  });

  const overallCTR = globalFunnel.impressions > 0 ? ((globalFunnel.clicks / globalFunnel.impressions) * 100).toFixed(2) : '0.00';
  const overallCR = globalFunnel.clicks > 0 ? ((globalFunnel.purchases / globalFunnel.clicks) * 100).toFixed(2) : '0.00';

  res.status(200).json({
    success: true,
    globalFunnel: {
      ...globalFunnel,
      overallCTR: `${overallCTR}%`,
      overallConversionRate: `${overallCR}%`
    },
    campaignFunnels
  });
};

/**
 * ADMIN: Audit Log Activity Stream
 */
export const getAuditLogs = async (req, res) => {
  const { limit = 50, page = 1 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const total = await MarketingAuditLog.countDocuments({});
  const logs = await MarketingAuditLog.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    total,
    logs
  });
};

/**
 * ADMIN: Marketing Asset Library
 */
export const getMarketingAssets = async (req, res) => {
  const { folder } = req.query;
  const query = {};
  if (folder && folder !== 'all') query.folder = folder;

  const assets = await MarketingAsset.find(query).sort({ createdAt: -1 }).lean();
  const folders = ['All', 'Banners', 'Popups', 'Announcements', 'Seasonal', 'Coupons', 'General'];

  res.status(200).json({
    success: true,
    folders,
    assets
  });
};

export const createMarketingAsset = async (req, res) => {
  const { name, folder, image, tags } = req.body;
  if (!name || !image?.url) {
    throw new ApiError(400, 'Asset name and image URL are required');
  }

  const asset = await MarketingAsset.create({
    name,
    folder: folder || 'General',
    image,
    tags: tags || [],
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Marketing asset saved to library',
    asset
  });
};

export const deleteMarketingAsset = async (req, res) => {
  const asset = await MarketingAsset.findByIdAndDelete(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found');

  res.status(200).json({
    success: true,
    message: 'Asset removed from library'
  });
};
