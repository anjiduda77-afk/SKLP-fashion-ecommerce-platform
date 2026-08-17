import mongoose from 'mongoose'

const sellerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  shopName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  shopSlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  logo: {
    url: { type: String, default: null },
    publicId: { type: String, default: null }
  },
  banner: {
    url: { type: String, default: null },
    publicId: { type: String, default: null }
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  businessType: {
    type: String,
    enum: ['individual', 'proprietorship', 'partnership', 'pvt_ltd', 'other'],
    default: 'individual'
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSales: {
    type: Number,
    default: 0
  },
  fulfillmentRate: {
    type: Number,
    default: 100, // percentage
    min: 0,
    max: 100
  },
  cancellationRate: {
    type: Number,
    default: 0, // percentage
    min: 0,
    max: 100
  },
  returnRate: {
    type: Number,
    default: 0, // percentage
    min: 0,
    max: 100
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'suspended'],
    default: 'verified',
    index: true
  },
  sellerStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'on_holiday'],
    default: 'active',
    index: true
  },
  commissionRate: {
    type: Number,
    default: 5, // Default 5% platform commission
    min: 0,
    max: 100
  },
  subscriptionStatus: {
    type: String,
    enum: ['trial', 'active', 'grace_period', 'expired', 'suspended'],
    default: 'trial',
    index: true
  },
  currentPlan: {
    type: String,
    enum: ['trial', 'basic', 'pro', 'business'],
    default: 'trial'
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  bankDetails: {
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
    isVerified: { type: Boolean, default: false }
  },
  shippingPolicy: {
    processingTimeDays: { type: Number, default: 2 },
    defaultDeliveryDays: { type: Number, default: 4 },
    shippingNotes: { type: String, default: 'Standard fast delivery across India' }
  },
  returnPolicy: {
    acceptsReturns: { type: Boolean, default: true },
    returnPeriodDays: { type: Number, default: 7 },
    policyNotes: { type: String, default: '7-day easy return policy for unworn items with tags intact' }
  }
}, { timestamps: true })

sellerSchema.index({ rating: -1 });
sellerSchema.index({ verificationStatus: 1, sellerStatus: 1 });

export default mongoose.model('Seller', sellerSchema)
