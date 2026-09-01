import mongoose from 'mongoose';

const marketingAssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true
  },
  folder: {
    type: String,
    enum: ['Banners', 'Popups', 'Announcements', 'Seasonal', 'Coupons', 'General'],
    default: 'General'
  },
  image: {
    url: {
      type: String,
      required: true
    },
    publicId: String,
    size: Number, // bytes
    format: String,
    width: Number,
    height: Number
  },
  tags: [{
    type: String,
    trim: true
  }],
  usedCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

marketingAssetSchema.index({ folder: 1, createdAt: -1 });

export default mongoose.model('MarketingAsset', marketingAssetSchema);
