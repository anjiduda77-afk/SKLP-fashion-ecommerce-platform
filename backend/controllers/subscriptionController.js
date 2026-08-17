import Subscription from '../models/Subscription.js'
import Seller from '../models/Seller.js'
import { ApiError } from '../middleware/errorHandler.js'

export const SELLER_PLANS = [
  {
    id: 'trial',
    name: '30-Day Free Trial',
    price: 0,
    period: '30 days',
    features: [
      'Zero monthly subscription fee for 30 days',
      'Unlimited product listing & offers',
      'Standard 5% marketplace commission',
      'Basic analytics & order dashboard',
      'Fast customer support'
    ]
  },
  {
    id: 'basic',
    name: 'Basic Seller',
    price: 99,
    period: 'month',
    features: [
      '₹99/month for new & small sellers',
      'Up to 50 active product listings',
      'Standard 5% order commission',
      'Weekly automated settlement payouts',
      'Mobile seller dashboard access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Seller',
    price: 299,
    period: 'month',
    popular: true,
    features: [
      '₹299/month for growing merchants',
      'Up to 250 active product listings',
      'Priority Buy-Box & offer recommendation boost',
      'Detailed customer & sales analytics',
      '7-day priority settlement payouts'
    ]
  },
  {
    id: 'business',
    name: 'Business Seller',
    price: 599,
    period: 'month',
    features: [
      '₹599/month for high-volume enterprise stores',
      'Unlimited product & variant listings',
      'Dedicated account manager & brand promotion',
      'Express settlement payout window',
      'API access & bulk CSV inventory upload'
    ]
  }
]

/**
 * Get available plans and current seller subscription
 */
export const getSubscriptionInfo = async (req, res) => {
  const seller = await Seller.findOne({ userId: req.user.id })
  if (!seller) {
    throw new ApiError(403, 'Seller profile not found')
  }

  let subscription = await Subscription.findOne({ sellerId: seller._id })

  if (!subscription) {
    // Initialize default trial
    subscription = await Subscription.create({
      sellerId: seller._id,
      plan: 'trial',
      amount: 0,
      status: 'TRIAL',
      trialStartDate: new Date(),
      trialEndDate: seller.trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
  }

  res.status(200).json({
    success: true,
    plans: SELLER_PLANS,
    currentSubscription: subscription,
    sellerStatus: seller.sellerStatus
  })
}

/**
 * Choose or upgrade subscription plan
 */
export const selectSubscriptionPlan = async (req, res) => {
  const { planId, paymentMethod = 'razorpay' } = req.body

  const seller = await Seller.findOne({ userId: req.user.id })
  if (!seller) {
    throw new ApiError(403, 'Seller profile not found')
  }

  const selectedPlan = SELLER_PLANS.find(p => p.id === planId)
  if (!selectedPlan) {
    throw new ApiError(400, 'Invalid subscription plan selected')
  }

  let subscription = await Subscription.findOne({ sellerId: seller._id })
  if (!subscription) {
    subscription = new Subscription({ sellerId: seller._id })
  }

  const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  subscription.plan = planId
  subscription.amount = selectedPlan.price
  subscription.status = 'ACTIVE'
  subscription.currentPeriodStart = new Date()
  subscription.currentPeriodEnd = nextBilling
  subscription.paymentMethod = paymentMethod

  subscription.history.push({
    plan: planId,
    amount: selectedPlan.price,
    paidAt: new Date(),
    status: 'ACTIVE',
    transactionId: `SUB_TXN_${Date.now()}`
  })

  await subscription.save()

  // Update seller current plan
  seller.currentPlan = planId
  seller.subscriptionStatus = 'active'
  await seller.save()

  res.status(200).json({
    success: true,
    message: `Subscribed to ${selectedPlan.name} plan successfully!`,
    subscription
  })
}
