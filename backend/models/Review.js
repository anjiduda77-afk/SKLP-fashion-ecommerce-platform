import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },

  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },

  title: {
    type: String,
    required: [true, 'Review title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },

  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [5000, 'Comment cannot exceed 5000 characters']
  },

  // Review Details
  images: [{
    url: String,
    publicId: String
  }],

  verified: {
    type: Boolean,
    default: false // Verified purchase
  },

  helpful: {
    type: Number,
    default: 0
  },

  unhelpful: {
    type: Number,
    default: 0
  },

  // Admin Actions
  isApproved: {
    type: Boolean,
    default: true
  },

  isFlagged: {
    type: Boolean,
    default: false
  },

  flagReason: String,

  moderatorNotes: String,

  // Seller Response
  sellerResponse: {
    message: String,
    respondedAt: Date,
    respondedBy: mongoose.Schema.Types.ObjectId
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
reviewSchema.index({ productId: 1, rating: 1 });
reviewSchema.index({ isApproved: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
