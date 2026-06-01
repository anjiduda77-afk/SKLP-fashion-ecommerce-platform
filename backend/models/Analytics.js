import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },

  type: {
    type: String,
    enum: ['page_view', 'product_view', 'search', 'add_to_cart', 'remove_from_cart', 'add_to_wishlist', 'checkout', 'purchase', 'review', 'click'],
    required: true
  },

  entityType: {
    type: String,
    enum: ['product', 'category', 'page', 'banner', 'search'],
  },

  entityId: mongoose.Schema.Types.ObjectId,

  metadata: {
    productId: mongoose.Schema.Types.ObjectId,
    categoryId: String,
    searchQuery: String,
    pageUrl: String,
    referrer: String,
    sessionId: String,
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop']
    },
    browser: String,
    os: String,
    ipAddress: String,
    country: String,
    city: String,
    timeSpent: Number // in seconds
  },

  customData: mongoose.Schema.Types.Mixed,

  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expire: 7776000 // Auto-delete after 90 days
  }
}, { timestamps: false });

analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ entityId: 1, timestamp: -1 });

export default mongoose.model('Analytics', analyticsSchema);
