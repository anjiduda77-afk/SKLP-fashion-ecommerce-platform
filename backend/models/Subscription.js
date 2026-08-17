import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    unique: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['trial', 'basic', 'pro', 'business'],
    default: 'trial'
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: ['TRIAL', 'ACTIVE', 'PAYMENT_FAILED', 'GRACE_PERIOD', 'CANCELLED', 'EXPIRED', 'SUSPENDED'],
    default: 'TRIAL',
    index: true
  },
  trialStartDate: {
    type: Date,
    default: Date.now
  },
  trialEndDate: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  gracePeriodEnd: Date,
  autoRenew: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'upi', 'manual', 'waived'],
    default: 'razorpay'
  },
  providerSubscriptionId: String,
  history: [{
    plan: String,
    amount: Number,
    paidAt: { type: Date, default: Date.now },
    status: String,
    transactionId: String
  }]
}, { timestamps: true })

export default mongoose.model('Subscription', subscriptionSchema)
