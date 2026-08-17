import mongoose from 'mongoose'

const sellerSettlementSchema = new mongoose.Schema({
  settlementId: {
    type: String,
    unique: true,
    index: true,
    default: () => `SETTLE_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  suborderId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNumber: String,
  eligibleAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    default: 5, // 5% platform commission
    min: 0,
    max: 100
  },
  platformCommission: {
    type: Number,
    required: true,
    min: 0
  },
  sellerPayout: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'AVAILABLE', 'PROCESSING', 'PAID', 'HELD', 'ADJUSTED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  holdUntil: {
    type: Date,
    required: true // 7-day settlement hold after delivery
  },
  deliveredAt: Date,
  paidAt: Date,
  payoutReference: String,
  notes: String,
  adjustmentReason: String
}, { timestamps: true })

sellerSettlementSchema.index({ sellerId: 1, status: 1 });
sellerSettlementSchema.index({ holdUntil: 1, status: 1 });

export default mongoose.model('SellerSettlement', sellerSettlementSchema)
