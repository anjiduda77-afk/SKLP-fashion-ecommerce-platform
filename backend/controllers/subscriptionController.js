import Subscription from '../models/Subscription.js'
import Product from '../models/Product.js'
import { ApiError } from '../middleware/errorHandler.js'
import { getOrCreateSellerProfile } from '../utils/sellerHelper.js'

export const SELLER_PLANS = [
  {
    id: 'trial',
    name: '30-Day Free Trial',
    price: 0,
    annualPrice: 0,
    period: '30 days',
    badge: 'Starter',
    maxListings: 50,
    commissionRate: 5,
    features: [
      'Zero monthly subscription fee for 30 days',
      'Up to 50 active couture listings & offers',
      'Standard 5% marketplace commission',
      'Basic analytics & order dashboard',
      'Fast customer email support',
      'Direct 7-day settlement ledger'
    ]
  },
  {
    id: 'basic',
    name: 'Basic Seller',
    price: 99,
    annualPrice: 999, // ~16% discount
    period: 'month',
    badge: 'Essential',
    maxListings: 50,
    commissionRate: 5,
    features: [
      '₹99/month for boutique & emerging designers',
      'Up to 50 active product listings',
      'Standard 5% order commission',
      'Weekly automated settlement payouts',
      'Mobile seller dashboard access',
      'Real-time order tracking & courier dispatch'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Seller',
    price: 299,
    annualPrice: 2999, // ~16% discount
    period: 'month',
    badge: 'Most Popular',
    popular: true,
    maxListings: 250,
    commissionRate: 4.5,
    features: [
      '₹299/month for growing fashion brands',
      'Up to 250 active product listings',
      'Priority Buy-Box & offer recommendation boost',
      'Detailed customer demographic & sales analytics',
      '7-day priority settlement payouts',
      'Reduced 4.5% marketplace commission'
    ]
  },
  {
    id: 'business',
    name: 'Business Enterprise',
    price: 599,
    annualPrice: 5999, // ~16% discount
    period: 'month',
    badge: 'Enterprise',
    maxListings: 10000,
    commissionRate: 4,
    features: [
      '₹599/month for high-volume enterprise stores',
      'Unlimited product & variant listings',
      'Dedicated account manager & brand promotion',
      'Express 48-hour settlement payout window',
      'Lowest 4.0% platform commission',
      'Bulk CSV inventory upload & API access'
    ]
  }
]

/**
 * Get available plans, current seller subscription, usage, and days remaining
 */
export const getSubscriptionInfo = async (req, res) => {
  const seller = await getOrCreateSellerProfile(req.user.id)
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found')
  }

  let subscription = await Subscription.findOne({ sellerId: seller._id })

  if (!subscription) {
    // Initialize default 30-day trial
    const trialEnd = seller.trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    subscription = await Subscription.create({
      sellerId: seller._id,
      plan: 'trial',
      amount: 0,
      status: 'TRIAL',
      trialStartDate: new Date(),
      trialEndDate: trialEnd,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
      history: [{
        plan: 'trial',
        amount: 0,
        paidAt: new Date(),
        status: 'TRIAL',
        transactionId: `TRIAL_INIT_${Date.now()}`
      }]
    })
  }

  // Check if current period has expired
  const now = new Date()
  const targetEnd = subscription.status === 'TRIAL' 
    ? new Date(subscription.trialEndDate) 
    : new Date(subscription.currentPeriodEnd)
  
  const msRemaining = targetEnd.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))

  if (daysRemaining === 0 && subscription.status === 'ACTIVE') {
    subscription.status = 'EXPIRED'
    seller.subscriptionStatus = 'expired'
    await Promise.all([subscription.save(), seller.save()])
  }

  // Count active product listings for usage statistics
  const activeProductsCount = await Product.countDocuments({
    createdBy: req.user.id,
    isActive: true
  })

  const currentPlanConfig = SELLER_PLANS.find(p => p.id === (subscription.plan || 'trial')) || SELLER_PLANS[0]

  res.status(200).json({
    success: true,
    plans: SELLER_PLANS,
    currentSubscription: subscription,
    currentPlanConfig,
    usage: {
      activeListings: activeProductsCount,
      maxListings: currentPlanConfig.maxListings,
      usagePercent: currentPlanConfig.maxListings 
        ? Math.min(100, Math.round((activeProductsCount / currentPlanConfig.maxListings) * 100))
        : 0
    },
    daysRemaining,
    sellerStatus: seller.sellerStatus,
    trialEndsAt: seller.trialEndsAt
  })
}

/**
 * Choose or upgrade subscription plan
 */
export const selectSubscriptionPlan = async (req, res) => {
  const { planId, billingCycle = 'monthly', paymentMethod = 'razorpay' } = req.body

  const seller = await getOrCreateSellerProfile(req.user.id)
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found')
  }

  const selectedPlan = SELLER_PLANS.find(p => p.id === planId)
  if (!selectedPlan) {
    throw new ApiError(400, 'Invalid subscription plan selected')
  }

  let subscription = await Subscription.findOne({ sellerId: seller._id })
  if (!subscription) {
    subscription = new Subscription({ sellerId: seller._id })
  }

  const isAnnual = billingCycle === 'annual'
  const planPrice = isAnnual ? (selectedPlan.annualPrice || selectedPlan.price * 10) : selectedPlan.price
  const durationDays = planId === 'trial' ? 30 : (isAnnual ? 365 : 30)
  const nextBilling = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

  subscription.plan = planId
  subscription.amount = planPrice
  subscription.billingCycle = isAnnual ? 'annual' : 'monthly'
  subscription.status = planId === 'trial' ? 'TRIAL' : 'ACTIVE'
  subscription.currentPeriodStart = new Date()
  subscription.currentPeriodEnd = nextBilling
  subscription.paymentMethod = paymentMethod

  subscription.history = subscription.history || []
  subscription.history.push({
    plan: `${planId}${isAnnual ? ' (Annual)' : ''}`,
    amount: planPrice,
    paidAt: new Date(),
    status: 'ACTIVE',
    transactionId: `SUB_TXN_${Date.now()}`
  })

  await subscription.save()

  // Update seller current plan & commission rate if custom
  seller.currentPlan = planId
  seller.subscriptionStatus = planId === 'trial' ? 'trial' : 'active'
  if (selectedPlan.commissionRate) {
    seller.commissionRate = selectedPlan.commissionRate
  }
  await seller.save()

  res.status(200).json({
    success: true,
    message: `Successfully activated ${selectedPlan.name} (${billingCycle})!`,
    subscription,
    plan: selectedPlan
  })
}
