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
    enum: ['order', 'payment', 'shipment', 'return', 'offer', 'review', 'account', 'system'],
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
      enum: ['order', 'product', 'user', 'coupon'],
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

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);
