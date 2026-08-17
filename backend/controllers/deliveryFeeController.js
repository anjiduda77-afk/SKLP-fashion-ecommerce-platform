import { calculateDeliveryBreakdown } from '../utils/deliveryUtils.js'
import DeliveryConfig from '../models/DeliveryConfig.js'
import { ApiError } from '../middleware/errorHandler.js'

// ── POST /api/delivery-fee/calculate ─────────────────────────────────────────
// Customer sends their delivery address; backend returns distance, fee, and label.
// The frontend must NOT compute its own fee — it always asks this endpoint.
export const calculateFee = async (req, res) => {
  const { street, city, state, postalCode, country } = req.body

  if (!city && !postalCode) {
    throw new ApiError(400, 'Please provide at least city or postal code to calculate delivery fee.')
  }

  const breakdown = await calculateDeliveryBreakdown({ street, city, state, postalCode, country })

  res.status(200).json({
    success: true,
    distanceKm: breakdown.distanceKm,
    deliveryFee: breakdown.deliveryFee,
    deliveryLabel: breakdown.deliveryLabel,
    geocodingFailed: breakdown.geocodingFailed,
    platformFeePercent: breakdown.platformFeePercent,
    storeAddress: breakdown.storeAddress
  })
}

// ── GET /api/delivery-fee/config ─────────────────────────────────────────────
// Returns current store location and slab config (for Admin panel display).
export const getDeliveryConfig = async (req, res) => {
  const config = await DeliveryConfig.getConfig()
  res.status(200).json({ success: true, config })
}

// ── PUT /api/delivery-fee/config ─────────────────────────────────────────────
// Admin: update store location, slabs, or platform fee percent.
export const updateDeliveryConfig = async (req, res) => {
  const { storeLocation, deliverySlabs, platformFeePercent } = req.body

  let config = await DeliveryConfig.findOne()
  if (!config) {
    config = new DeliveryConfig()
  }

  if (storeLocation) config.storeLocation = { ...config.storeLocation, ...storeLocation }
  if (deliverySlabs && Array.isArray(deliverySlabs)) config.deliverySlabs = deliverySlabs
  if (platformFeePercent !== undefined) config.platformFeePercent = platformFeePercent

  await config.save()

  res.status(200).json({ success: true, message: 'Delivery configuration updated.', config })
}
