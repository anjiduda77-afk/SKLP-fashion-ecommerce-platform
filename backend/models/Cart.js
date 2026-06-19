import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  items: [{
    _id: mongoose.Schema.Types.ObjectId,
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },
    variant: {
      size: String,
      color: String,
      material: String
    },
    price: Number,
    discount: Number,
    finalPrice: Number,
    image: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Cart Totals
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  totalItems: {
    type: Number,
    default: 0,
    min: 0
  },
  totalQuantity: {
    type: Number,
    default: 0,
    min: 0
  },

  // Coupon Information
  couponCode: String,
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  couponExpiry: Date,

  // Cart Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  },

  // Abandoned Cart
  abandonedAt: Date,
  recoveryEmailSent: Boolean,

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
cartSchema.index({ lastModified: -1 });

export default mongoose.model('Cart', cartSchema);
