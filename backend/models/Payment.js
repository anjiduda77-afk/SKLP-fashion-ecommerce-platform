import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    index: true,
    default: () => `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  provider: {
    type: String,
    enum: ['razorpay', 'cod', 'upi', 'card'],
    required: true
  },
  status: {
    type: String,
    enum: ['INITIATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
    default: 'INITIATED',
    index: true
  },
  gatewayOrderId: String, // e.g. Razorpay order_id
  gatewayPaymentId: String, // e.g. Razorpay payment_id
  gatewaySignature: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  refundDetails: [{
    refundId: String,
    gatewayRefundId: String,
    amount: Number,
    reason: String,
    status: String,
    createdAt: { type: Date, default: Date.now }
  }],
  capturedAt: Date
}, { timestamps: true })

paymentSchema.index({ gatewayOrderId: 1 });
paymentSchema.index({ gatewayPaymentId: 1 });

export default mongoose.model('Payment', paymentSchema)
