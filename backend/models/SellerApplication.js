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
  applicationReference: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
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
  ownerName: {
    type: String
  },
  dob: {
    type: String
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
  altPhone: {
    type: String,
    trim: true,
    default: ''
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  brandNameNormalized: {
    type: String,
    lowercase: true,
    trim: true
  },
  productCategories: [{
    type: String
  }],
  storeDescription: {
    type: String,
    default: '',
    maxlength: 1000
  },
  category: String,
  subcategory: String,
  businessEmail: {
    type: String,
    lowercase: true,
    trim: true,
    default: ''
  },
  businessPhone: {
    type: String,
    trim: true,
    default: ''
  },
  yearEstablished: {
    type: Number
  },
  brandLogo: {
    url: { type: String, default: null },
    publicId: { type: String, default: null }
  },
  businessType: {
    type: String,
    enum: ['individual', 'proprietorship', 'partnership', 'pvt_ltd', 'other'],
    default: 'individual'
  },
  businessAddress: {
    street: { type: String, default: '' },
    street2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },
  pickupAddressSameAsBusiness: {
    type: Boolean,
    default: true
  },
  pickupAddress: {
    street: { type: String, default: '' },
    street2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },
  shopImages: [{
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    imageType: { type: String, default: 'shop_exterior' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  ownerPhoto: {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now }
  },
  signature: {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now }
  },
  termsAccepted: {
    type: Boolean,
    default: false
  },
  sellerTermsVersion: {
    type: String,
    default: 'v1.0'
  },
  termsAcceptedAt: {
    type: Date
  },
  termsAcceptedIp: {
    type: String,
    default: ''
  },
  deliveryMode: {
    type: String,
    enum: ['FREE_DELIVERY', 'PAID_DELIVERY'],
    default: 'PAID_DELIVERY'
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
  // Structured Multi-Point Verification
  verification: {
    pan: {
      number: String,
      status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW', 'NOT_CONFIGURED'], default: 'PENDING' },
      nameOnPan: String,
      verifiedAt: Date
    },
    gst: {
      isRegistered: { type: Boolean, default: false },
      gstin: String,
      status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'FAILED', 'NOT_APPLICABLE', 'NOT_CONFIGURED'], default: 'NOT_APPLICABLE' },
      tradeName: String,
      verifiedAt: Date
    },
    udyam: {
      number: String,
      status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'FAILED', 'NOT_APPLICABLE'], default: 'NOT_APPLICABLE' },
      verifiedAt: Date
    },
    company: {
      cin: String,
      status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'FAILED', 'NOT_APPLICABLE'], default: 'NOT_APPLICABLE' },
      verifiedAt: Date
    },
    trademark: {
      applicationNumber: String,
      status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW', 'NOT_APPLICABLE'], default: 'NOT_APPLICABLE' },
      verifiedAt: Date
    },
    bank: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'FAILED', 'MISMATCH', 'NOT_CONFIGURED'], default: 'PENDING' },
      verifiedAt: Date
    },
    shopImages: [{
      url: String,
      publicId: String,
      imageType: { type: String, enum: ['shop_front', 'shop_interior', 'signboard', 'product_display', 'warehouse', 'other'], default: 'shop_front' },
      status: { type: String, enum: ['PENDING', 'REVIEWED', 'REJECTED'], default: 'PENDING' },
      uploadedAt: { type: Date, default: Date.now }
    }],
    ownerVerification: {
      videoUrl: String,
      publicId: String,
      status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED', 'MANUAL_REVIEW'], default: 'PENDING' },
      verifiedAt: Date,
      notes: String
    }
  },
  documents: [documentSchema],
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW', 'NEEDS_CORRECTION', 'REVIEW_REQUIRED', 'VERIFICATION_REQUIRED', 'APPROVED', 'REQUEST_CHANGES', 'REJECTED', 'SUSPENDED'],
    default: 'PENDING_REVIEW',
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
  reviewFlags: [{
    type: String
  }],
  adminNotes: {
    type: String,
    default: ''
  },
  correctionReason: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  kyc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SellerKYC'
  },
  kycStatus: {
    type: String,
    enum: ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'PARTIALLY_VERIFIED', 'VERIFIED', 'NEEDS_REVIEW', 'FAILED', 'REJECTED', 'NOT_CONFIGURED'],
    default: 'NOT_STARTED',
    index: true
  },
  auditLogs: [auditLogSchema]
}, { timestamps: true })

sellerApplicationSchema.pre('save', function(next) {
  if (!this.brandName) {
    this.brandName = this.shopName;
  }
  if (!this.ownerName && this.applicantName) {
    this.ownerName = this.applicantName;
  }
  if (!this.applicantName && this.ownerName) {
    this.applicantName = this.ownerName;
  }
  if (this.brandName) {
    this.brandNameNormalized = this.brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  if (!this.applicationReference) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.applicationReference = `SSA-${dateStr}-${rand}`;
  }
  next();
});

sellerApplicationSchema.index({ status: 1, riskLevel: 1 });
sellerApplicationSchema.index({ email: 1, phone: 1 });
sellerApplicationSchema.index({ brandNameNormalized: 1 }, { sparse: true });

export default mongoose.model('SellerApplication', sellerApplicationSchema)
