import mongoose from 'mongoose';

const campaignVariantSchema = new mongoose.Schema({
  variantId: {
    type: String,
    enum: ['A', 'B'],
    required: true
  },
  name: {
    type: String,
    default: 'Variant'
  },
  weight: {
    type: Number,
    default: 50, // 50% traffic split by default
    min: 0,
    max: 100
  },
  image: {
    url: String,
    publicId: String,
    alt: String
  },
  mobileImage: {
    url: String,
    publicId: String
  },
  headline: {
    type: String,
    required: true
  },
  subheadline: String,
  badgeText: String,
  ctaText: {
    type: String,
    default: 'Shop Now'
  },
  ctaLink: {
    type: String,
    default: '/products'
  },
  ctaStyle: {
    type: String,
    enum: ['primary', 'secondary', 'gold', 'outline', 'dark'],
    default: 'gold'
  },
  backgroundColor: {
    type: String,
    default: '#121212'
  },
  textColor: {
    type: String,
    default: '#FFFFFF'
  }
}, { _id: false });

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Campaign title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['banner', 'popup', 'announcement-bar', 'exit-intent', 'product-spotlight'],
    required: true
  },

  // 1. Placement Targeting
  placement: {
    type: String,
    enum: ['homepage', 'category', 'product', 'cart', 'checkout', 'seller', 'custom'],
    default: 'homepage'
  },
  customRoutePattern: {
    type: String,
    default: ''
  },
  targetCategories: [{
    type: String,
    trim: true
  }],

  // 2. Audience Targeting
  audience: {
    type: String,
    enum: ['all', 'guests', 'logged-in', 'new-customers', 'returning-customers', 'cart-abandoners'],
    default: 'all'
  },

  // 3. Device Targeting
  device: {
    type: String,
    enum: ['all', 'desktop', 'mobile'],
    default: 'all'
  },

  // 4. Coupon Integration
  coupon: {
    enabled: {
      type: Boolean,
      default: false
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    couponCode: {
      type: String,
      uppercase: true,
      trim: true
    },
    autoApply: {
      type: Boolean,
      default: false
    }
  },

  // 5. Frequency & Display Control
  frequency: {
    type: {
      type: String,
      enum: ['always', 'session', 'daily', 'pageviews', 'delay'],
      default: 'always'
    },
    value: {
      type: Number,
      default: 1 // e.g. every 3 pageviews or 5 seconds delay
    }
  },

  // 6. Priority & Smart Fallback
  priority: {
    type: Number,
    default: 10, // Higher number = higher priority evaluation
    min: 1,
    max: 100
  },

  // 7. Scheduling & Status
  schedule: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'expired'],
    default: 'active'
  },

  // 8. Campaign Limits & Auto-pause
  limits: {
    maxClicks: {
      type: Number,
      default: null
    },
    maxRedemptions: {
      type: Number,
      default: null
    },
    maxOrders: {
      type: Number,
      default: null
    },
    currentClicks: {
      type: Number,
      default: 0
    },
    currentRedemptions: {
      type: Number,
      default: 0
    },
    currentOrders: {
      type: Number,
      default: 0
    }
  },

  // 9. Stock-Aware Promoted Products
  promotedProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    fallbackUrl: {
      type: String,
      default: '/products'
    }
  }],

  // 10. A/B Testing & Content Variants
  isAbTest: {
    type: Boolean,
    default: false
  },
  variants: [campaignVariantSchema],

  // 11. Conversion Funnel & Performance Metrics
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    addToCarts: { type: Number, default: 0 },
    checkouts: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    revenueGenerated: { type: Number, default: 0 },
    variantA: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      productViews: { type: Number, default: 0 },
      addToCarts: { type: Number, default: 0 },
      checkouts: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      revenueGenerated: { type: Number, default: 0 }
    },
    variantB: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      productViews: { type: Number, default: 0 },
      addToCarts: { type: Number, default: 0 },
      checkouts: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      revenueGenerated: { type: Number, default: 0 }
    }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Auto-compute status before saving
campaignSchema.pre('save', function(next) {
  const now = new Date();
  if (this.status !== 'paused' && this.status !== 'draft') {
    if (this.schedule.endDate && this.schedule.endDate < now) {
      this.status = 'expired';
    } else if (this.schedule.startDate && this.schedule.startDate > now) {
      this.status = 'scheduled';
    } else {
      this.status = 'active';
    }
  }

  // Check limits
  if (this.limits) {
    if (this.limits.maxClicks && this.limits.currentClicks >= this.limits.maxClicks) {
      this.status = 'completed';
    }
    if (this.limits.maxRedemptions && this.limits.currentRedemptions >= this.limits.maxRedemptions) {
      this.status = 'completed';
    }
    if (this.limits.maxOrders && this.limits.currentOrders >= this.limits.maxOrders) {
      this.status = 'completed';
    }
  }

  next();
});

campaignSchema.index({ status: 1, type: 1, placement: 1, priority: -1 });
campaignSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });

export default mongoose.model('Campaign', campaignSchema);
