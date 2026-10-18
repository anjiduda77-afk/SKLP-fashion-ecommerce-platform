import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['order', 'payment', 'shipment', 'return', 'offer', 'review', 'account', 'system', 'seller_approved', 'seller_rejected', 'seller_info_required', 'seller_suspended', 'seller_reactivated'],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  image: String,

  relatedEntity: {
    entityType: {
      type: String,
      enum: ['order', 'product', 'user', 'coupon', 'seller', 'application'],
    },
    entityId: mongoose.Schema.Types.ObjectId
  },

  actionUrl: String,

  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  channels: {
    email: {
      sent: Boolean,
      sentAt: Date,
      opened: Boolean,
      openedAt: Date
    },
    sms: {
      sent: Boolean,
      sentAt: Date
    },
    push: {
      sent: Boolean,
      sentAt: Date
    },
    inApp: {
      type: Boolean,
      default: true
    }
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expire: 2592000 // Auto-delete after 30 days
  }
}, { timestamps: true });

const sanitizeField = (val) => {
  if (!val || typeof val !== 'string') return val;
  return val
    .replace(/Firebase(?:\s*Admin|\s*Cloud\s*Messaging)?/gi, 'Authentication')
    .replace(/\bFCM\b/gi, 'Push')
    .replace(/Mongo(?:DB)?(?:ServerError)?:?\s*/gi, 'Database ')
    .replace(/Mongoose:?\s*/gi, 'Database ')
    .replace(/Vercel(?:\.app)?:?\s*/gi, 'Web Server ')
    .replace(/Render(?:\.com)?:?\s*/gi, 'Application Server ')
    .replace(/onrender\.com/gi, 'server')
    .replace(/([a-zA-Z]:\\|\/(?:home|var|etc|tmp|app|usr)\/)/g, '')
    .trim();
};

notificationSchema.pre('save', function (next) {
  if (this.title) this.title = sanitizeField(this.title);
  if (this.message) this.message = sanitizeField(this.message);
  next();
});

notificationSchema.pre('insertMany', function (next, docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.title) doc.title = sanitizeField(doc.title);
      if (doc.message) doc.message = sanitizeField(doc.message);
    });
  }
  next();
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);
