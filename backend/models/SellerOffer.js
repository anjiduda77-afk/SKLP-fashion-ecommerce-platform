import mongoose from 'mongoose'

const sellerOfferSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true
  },
  condition: {
    type: String,
    enum: ['new', 'refurbished', 'like_new'],
    default: 'new'
  },
  deliveryDays: {
    type: Number,
    default: 3,
    min: 1
  },
  freeDelivery: {
    type: Boolean,
    default: false
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  returnPolicyDays: {
    type: Number,
    default: 7
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  recommendationScore: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

sellerOfferSchema.index({ productId: 1, sellerId: 1 }, { unique: true });
sellerOfferSchema.index({ productId: 1, isActive: 1, price: 1 });

export default mongoose.model('SellerOffer', sellerOfferSchema)
