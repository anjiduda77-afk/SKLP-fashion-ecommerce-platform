import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required']
  },

  description: String,

  image: {
    url: {
      type: String,
      required: true
    },
    publicId: String,
    alt: String
  },

  mobileImage: {
    url: String,
    publicId: String
  },

  type: {
    type: String,
    enum: ['hero', 'offer', 'category', 'brand', 'seasonal'],
    required: true
  },

  link: String,

  linkType: {
    type: String,
    enum: ['product', 'category', 'collection', 'external', 'none'],
    default: 'none'
  },

  cta: {
    text: String,
    style: {
      type: String,
      enum: ['primary', 'secondary', 'outline'],
      default: 'primary'
    }
  },

  position: {
    type: String,
    enum: ['home-hero', 'home-featured', 'home-bottom', 'category-header', 'sidebar'],
    required: true
  },

  displayOrder: {
    type: Number,
    default: 0
  },

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

  targetAudience: {
    type: String,
    enum: ['all', 'new-users', 'loyal-users', 'vip'],
    default: 'all'
  },

  analytics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversionRate: Number
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

bannerSchema.index({ position: 1, displayOrder: 1 });
bannerSchema.index({ isActive: 1, startDate: 1 });

export default mongoose.model('Banner', bannerSchema);
