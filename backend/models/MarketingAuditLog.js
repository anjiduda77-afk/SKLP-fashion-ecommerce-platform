import mongoose from 'mongoose';

const marketingAuditLogSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  campaignTitle: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: [
      'created', 'edited', 'published', 'paused', 'resumed',
      'deleted', 'cloned', 'reordered', 'schedule_changed',
      'emergency_stop_all'
    ],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  adminUser: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String
  },
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

marketingAuditLogSchema.index({ createdAt: -1 });
marketingAuditLogSchema.index({ campaignId: 1 });

export default mongoose.model('MarketingAuditLog', marketingAuditLogSchema);
