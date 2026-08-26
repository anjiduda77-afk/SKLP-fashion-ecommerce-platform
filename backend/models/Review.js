import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Delivered Order ID is required for review verification']
  },

  rating: {
    type: Number,
    required: [true, 'Star rating is required'],
    min: [1, 'Rating must be at least 1 star'],
    max: [5, 'Rating cannot exceed 5 stars'],
    index: true
  },

  title: {
    type: String,
    trim: true,
    maxlength: [120, 'Title cannot exceed 120 characters'],
    default: ''
  },

  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [4, 'Comment must be at least 4 characters'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },

  // Review Images (up to 5 images)
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Verified Purchase Flag (Backend verified only)
  verifiedPurchase: {
    type: Boolean,
    default: true
  },

  // Moderation Status: PENDING / APPROVED / REJECTED / HIDDEN
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'],
    default: 'APPROVED',
    index: true
  },

  // Sizing & Fit Feedback
  fitFeedback: {
    type: String,
    enum: ['runs_small', 'true_to_size', 'runs_large', 'not_specified'],
    default: 'not_specified'
  },

  // Helpful Voting System
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },

  helpfulUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Reviewer Cached Display Info
  reviewerName: {
    type: String,
    default: 'Verified Customer'
  },

  reviewerAvatar: {
    type: String,
    default: ''
  },

  // Moderation Audit Trail
  moderationNotes: {
    type: String,
    default: ''
  },

  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  moderatedAt: Date,

  // Seller / Official Brand Response
  sellerResponse: {
    message: String,
    respondedAt: Date,
    respondedByName: { type: String, default: 'SKLP Official Store' },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, {
  timestamps: true
});

// Indexes for fast querying, filtering & sorting
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, status: 1, rating: 1 });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true }); // One review per customer per product
reviewSchema.index({ 'images.0': 1 }); // Fast indexing of reviews with photos

export default mongoose.model('Review', reviewSchema);
