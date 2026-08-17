import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  docType: {
    type: String,
    enum: ['govt_id', 'pan_card', 'bank_proof', 'address_proof', 'gst_certificate', 'brand_authorization'],
    required: true
  },
  fileUrl: { type: String, required: true },
  publicId: { type: String, default: null },
  docNumber: { type: String, default: '' },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'REUPLOAD_REQUIRED'],
    default: 'PENDING'
  },
  adminNotes: { type: String, default: '' },
  verifiedAt: Date
}, { _id: false })

const auditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  oldStatus: String,
  newStatus: String,
  reason: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false })

const sellerApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  applicantName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['individual', 'proprietorship', 'partnership', 'pvt_ltd', 'other'],
    default: 'individual'
  },
  businessAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'India' }
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  documents: [documentSchema],
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED'],
    default: 'SUBMITTED',
    index: true
  },
  riskScore: {
    type: Number,
    default: 0, // 0 - 100
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK'],
    default: 'LOW_RISK',
    index: true
  },
  riskFlags: [{
    type: String
  }],
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  auditLogs: [auditLogSchema]
}, { timestamps: true })

sellerApplicationSchema.index({ status: 1, riskLevel: 1 });
sellerApplicationSchema.index({ email: 1, phone: 1 });

export default mongoose.model('SellerApplication', sellerApplicationSchema)
