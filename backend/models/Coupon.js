import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]+$/, 'Coupon code must contain only uppercase letters and numbers']
  },

  description: String,

  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },

  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: 0
  },

  minPurchaseAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  maxDiscountAmount: {
    type: Number,
    default: null
  },

  // Applicable To
  applicableCategories: [String],
  applicableGenders: [String],
  applicableProducts: [mongoose.Schema.Types.ObjectId],
  excludedProducts: [mongoose.Schema.Types.ObjectId],

  // Usage Limits
  maxUses: Number,
  maxUsesPerUser: {
    type: Number,
    default: 1
  },
  currentUses: {
    type: Number,
    default: 0
  },

  // Validity
  isActive: {
    type: Boolean,
    default: true
  },

  startDate: {
    type: Date,
    required: true
  },

  endDate: {
    type: Date,
    required: true
  },

  // User Restrictions
  applicableToNewUsers: {
    type: Boolean,
    default: false
  },

  applicableUsers: [mongoose.Schema.Types.ObjectId],
  excludedUsers: [mongoose.Schema.Types.ObjectId],

  // Usage Tracking
  usedBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    orderId: mongoose.Schema.Types.ObjectId,
    usedAt: Date,
    discountGiven: Number
  }],

  // Analytics
  impressions: {
    type: Number,
    default: 0
  },

  conversionRate: Number,

  totalDiscountGiven: {
    type: Number,
    default: 0
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
couponSchema.index({ createdAt: -1 });

export default mongoose.model('Coupon', couponSchema);
