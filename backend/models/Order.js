import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  // Order Information
  orderNumber: {
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

  // Items in Order
  items: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller'
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerOffer'
    },
    shopNameSnapshot: {
      type: String,
      default: 'SKLP Official'
    },
    brand: String,
    productName: String,
    name: String,
    sku: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: Number, // Price at time of order
    discount: Number,
    finalPrice: Number,
    images: [{ url: String, alt: String }],
    variant: {
      size: String,
      color: String,
      material: String
    },
    image: String,
  }],

  // ── Multi-Seller Suborders (Each seller sees only their own slice) ──────────
  sellerSuborders: [{
    suborderId: {
      type: String,
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true
    },
    shopNameSnapshot: {
      type: String,
      required: true
    },
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productName: String,
      brand: String,
      quantity: Number,
      price: Number,
      finalPrice: Number,
      variant: Object,
      image: String
    }],
    subtotal: {
      type: Number,
      required: true
    },
    commissionRate: {
      type: Number,
      default: 5
    },
    platformCommission: {
      type: Number,
      default: 0
    },
    sellerPayout: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending'
    },
    trackingDetails: {
      carrier: String,
      trackingNumber: String,
      estimatedDelivery: Date
    },
    dispatchedAt: Date,
    deliveredAt: Date,
    settlementStatus: {
      type: String,
      enum: ['PENDING', 'AVAILABLE', 'PAID', 'HELD', 'CANCELLED'],
      default: 'PENDING'
    }
  }],

  // Pricing Details
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  couponCode: String,
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // ── Distance-Based Delivery ──────────────────────────────────────────────
  deliveryDistance: {
    type: Number,         // in kilometres, null if geocoding failed
    default: null
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryLabel: {
    type: String,
    default: ''           // e.g. "Free delivery within 5 km 🎉"
  },
  // ── Platform Fee (5% of subtotal) ───────────────────────────────────────
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  // ── Legacy / fallback shipping charge ───────────────────────────────────
  shippingCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    min: 0
  },
  total: {
    type: Number,
    min: 0
  },

  // Addresses
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['cod', 'card', 'upi', 'razorpay', 'phonepe', 'googlepay', 'paytm'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  paymentReference: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentDetails: {
    method: String,
    timestamp: Date,
    signature: String
  },

  // Order Status
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'packed',
      'shipped',
      'ready_for_pickup',
      'out-for-delivery',
      'out_for_delivery',
      'delivered',
      'failed_delivery',
      'returned',
      'return_requested',
      'cancelled',
      'refunded'
    ],
    default: 'pending',
    index: true
  },
  statusTimeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String,
    updatedBy: mongoose.Schema.Types.ObjectId
  }],
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    comment: String
  }],

  // Return tracking
  returnRequested: { type: Boolean, default: false },
  returnReason: String,

  // Shipping & Delivery Partner Information
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  deliveryOTP: String,
  deliveryNotes: String,
  deliveryLocation: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  lastLocationUpdate: Date,
  shippingMethod: String,
  trackingNumber: String,
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  carrier: String,

  // Returns & Refunds
  returnRequest: {
    status: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected', 'received', 'processed'],
      default: 'none'
    },
    reason: String,
    requestedAt: Date,
    approvedAt: Date,
    processedAt: Date,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },

  // Cancellation
  cancellation: {
    requested: Boolean,
    requestedAt: Date,
    reason: String,
    approvedAt: Date,
    refundAmount: Number
  },

  // Contact Info
  phone: String,

  // Customer Information
  customerNotes: String,
  internalNotes: String,

  // Notifications
  notificationsSent: [{
    type: String,
    sentAt: Date
  }],

  // Analytics
  isProcessed: { type: Boolean, default: false },
  processingTime: Number,

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

// Auto-generate order number before saving
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const timestamp = date.getTime();
    this.orderNumber = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${timestamp}`;
  }
  next();
});

// Indexes for performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model('Order', orderSchema);
