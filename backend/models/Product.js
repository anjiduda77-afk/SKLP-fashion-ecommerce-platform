import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    minlength: [10, 'Description must be at least 10 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },

  // Classification
  category: {
    type: String,
    enum: ['shirts', 't-shirts', 'jeans', 'sarees', 'hoodies', 'shoes', 'accessories', 'fashion-wear'],
    required: [true, 'Category is required'],
    index: true
  },
  subcategory: String,
  gender: {
    type: String,
    enum: ['men', 'women', 'kids', 'unisex'],
    required: [true, 'Gender is required'],
    index: true
  },
  brand: String,
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },

  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: Number,
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  costPrice: Number,

  // Images and Media
  images: [{
    url: String,
    publicId: String, // for Cloudinary
    isMain: { type: Boolean, default: false },
    alt: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  thumbnail: String,
  videoUrl: String,

  // Inventory
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  reservedStock: {
    type: Number,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  isOutOfStock: {
    type: Boolean,
    default: false
  },

  // Variants (Size, Color, etc.)
  variants: [{
    _id: mongoose.Schema.Types.ObjectId,
    type: {
      type: String,
      enum: ['size', 'color', 'material'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    options: [String],
    isRequired: Boolean
  }],

  // Product Attributes
  attributes: {
    material: String,
    color: String,
    fit: String,
    pattern: String,
    sleeves: String,
    neckType: String,
    care: [String]
  },

  // Ratings and Reviews
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  reviews: [mongoose.Schema.Types.ObjectId],

  // SEO and Meta
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  seoSlug: {
    type: String,
    unique: true,
    sparse: true
  },

  // Policies
  returnPolicy: String,
  warrantyPeriod: String,
  exchangePolicy: String,

  // Status and Publishing
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  scheduledPublishAt: Date,

  // Collections
  collections: [String],
  tags: [String],

  // Fraud Detection
  isFakeDetected: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'flagged', 'rejected'],
    default: 'pending'
  },
  moderationNotes: String,

  // Analytics
  views: {
    type: Number,
    default: 0
  },
  wishlistCount: {
    type: Number,
    default: 0
  },
  cartAddCount: {
    type: Number,
    default: 0
  },
  purchaseCount: {
    type: Number,
    default: 0
  },

  // Related Products
  relatedProducts: [mongoose.Schema.Types.ObjectId],
  upSellProducts: [mongoose.Schema.Types.ObjectId],
  crossSellProducts: [mongoose.Schema.Types.ObjectId],

  // Multi-language Support
  translations: {
    te: { // Telugu
      name: String,
      description: String,
      shortDescription: String
    },
    hi: { // Hindi
      name: String,
      description: String,
      shortDescription: String
    }
  },

  // Admin Fields
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,

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

// Calculate discount and discounted price
productSchema.virtual('discountedPrice').get(function() {
  return this.price - (this.price * this.discount / 100);
});

// Ensure virtuals are serialized
productSchema.set('toJSON', { virtuals: true });

// Middleware to update isFeatured based on stock
productSchema.pre('save', function(next) {
  this.isOutOfStock = this.stock <= 0;
  next();
});

// Index for search and filtering
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, gender: 1 });
productSchema.index({ price: 1, discount: 1 });
productSchema.index({ rating: -1, reviewCount: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isActive: 1, publishedAt: -1 });

// Plugin for pagination
productSchema.plugin(mongoosePaginate);

export default mongoose.model('Product', productSchema);
