import {
  calculateDeliveryBreakdown,
  calculateDeliveryBreakdownForSeller,
  calculateMultiSellerDeliveryBreakdown,
  validateCoordinates,
  isIndiaCoordinates
} from '../utils/deliveryUtils.js'
import DeliveryConfig from '../models/DeliveryConfig.js'
import Seller from '../models/Seller.js'
import { ApiError } from '../middleware/errorHandler.js'

// ── POST /api/delivery-fee/calculate ─────────────────────────────────────────
// Customer sends delivery address; backend returns distance, fee, and breakdown.
// Authoritative calculation on backend:
// - Free Delivery sellers: ₹0
// - Paid Delivery sellers: 0-6km: ₹10, 6.1-12km: ₹20, 12.1-40km: ₹30, >40km: ₹50
// - Multi-seller carts calculate each seller independently and sum them up.
export const calculateFee = async (req, res) => {
  const { street, city, state, postalCode, country, subtotal, items, sellerIds } = req.body

  if (!city && !postalCode) {
    throw new ApiError(400, 'Please provide at least city or postal code to calculate delivery fee.')
  }

  const numericSubtotal = typeof subtotal === 'number' && subtotal >= 0 ? subtotal : 0
  const shippingAddress = { street, city, state, postalCode, country }

  // Extract distinct seller IDs if provided
  let distinctSellerIds = []
  if (Array.isArray(sellerIds) && sellerIds.length > 0) {
    distinctSellerIds = [...new Set(sellerIds.filter(Boolean).map(String))]
  } else if (Array.isArray(items) && items.length > 0) {
    distinctSellerIds = [...new Set(items.map(i => i.sellerId || i.seller).filter(Boolean).map(String))]
  }

  if (distinctSellerIds.length > 1) {
    // Multi-seller calculation
    const sellers = await Seller.find({ _id: { $in: distinctSellerIds } }).lean()
    const sellerEntries = sellers.map(seller => {
      // Calculate this seller's item subtotal if items array has prices
      let sellerSub = 0
      if (Array.isArray(items)) {
        sellerSub = items
          .filter(it => String(it.sellerId || it.seller) === String(seller._id))
          .reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0)
      }
      return { seller, subtotal: sellerSub || numericSubtotal / sellers.length }
    })

    const multiBreakdown = await calculateMultiSellerDeliveryBreakdown(
      shippingAddress,
      sellerEntries
    )

    return res.status(200).json({
      success: true,
      distanceKm: multiBreakdown.distanceKm,
      deliveryFee: multiBreakdown.deliveryFee,
      deliveryLabel: multiBreakdown.deliveryLabel,
      deliveryUnavailable: multiBreakdown.deliveryUnavailable || false,
      deliveryMethod: 'self_delivery',
      platformFeePercent: multiBreakdown.platformFeePercent,
      sellerBreakdowns: multiBreakdown.sellerBreakdowns
    })
  } else if (distinctSellerIds.length === 1) {
    // Single specific seller
    const seller = await Seller.findById(distinctSellerIds[0]).lean()
    const sellerLocation = seller?.pickupAddress?.lat && seller?.pickupAddress?.lng
      ? seller.pickupAddress
      : seller?.shopLocation

    const breakdown = await calculateDeliveryBreakdownForSeller(
      shippingAddress,
      sellerLocation,
      null,
      numericSubtotal,
      seller?.deliveryMode || 'PAID_DELIVERY'
    )

    return res.status(200).json({
      success: true,
      distanceKm: breakdown.distanceKm,
      deliveryFee: breakdown.deliveryFee,
      deliveryLabel: breakdown.deliveryLabel,
      deliveryUnavailable: breakdown.deliveryUnavailable || false,
      deliveryMethod: breakdown.deliveryMethod || 'self_delivery',
      geocodingFailed: breakdown.geocodingFailed,
      platformFeePercent: breakdown.platformFeePercent,
      storeAddress: breakdown.storeAddress
    })
  }

  // Fallback default calculation
  const breakdown = await calculateDeliveryBreakdown(shippingAddress, numericSubtotal)

  res.status(200).json({
    success: true,
    distanceKm: breakdown.distanceKm,
    deliveryFee: breakdown.deliveryFee,
    deliveryLabel: breakdown.deliveryLabel,
    deliveryUnavailable: breakdown.deliveryUnavailable || false,
    deliveryMethod: breakdown.deliveryMethod || 'self_delivery',
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
// Admin: update store location, slabs, or platform fee percent with strict validation.
export const updateDeliveryConfig = async (req, res) => {
  const {
    storeLocation,
    deliverySlabs,
    platformFeePercent,
    deliveryPartnerEnabled,
    maxServiceDistanceKm,
    freeDeliveryThresholdAmount,
    minimumDeliveryFee
  } = req.body

  let config = await DeliveryConfig.findOne()
  if (!config) {
    config = new DeliveryConfig()
  }

  // 1. Validate storeLocation coordinates
  if (storeLocation) {
    if (storeLocation.lat !== undefined || storeLocation.lng !== undefined) {
      const lat = Number(storeLocation.lat)
      const lng = Number(storeLocation.lng)
      if (!validateCoordinates(lat, lng)) {
        throw new ApiError(400, 'Invalid store coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.')
      }
      if (!isIndiaCoordinates(lat, lng)) {
        throw new ApiError(400, 'Store location coordinates must be within India (lat 6-38, lng 68-98).')
      }
      config.storeLocation.lat = lat
      config.storeLocation.lng = lng
    }
    if (storeLocation.address !== undefined) {
      config.storeLocation.address = String(storeLocation.address).trim()
    }
  }

  // 2. Validate delivery slabs
  if (deliverySlabs !== undefined) {
    if (!Array.isArray(deliverySlabs) || deliverySlabs.length === 0) {
      throw new ApiError(400, 'deliverySlabs must be a non-empty array of slab definitions.')
    }
    for (let i = 0; i < deliverySlabs.length; i++) {
      const slab = deliverySlabs[i]
      if (typeof slab.minKm !== 'number' || typeof slab.maxKm !== 'number' || typeof slab.fee !== 'number') {
        throw new ApiError(400, `Slab at index ${i} must have numeric minKm, maxKm, and fee.`)
      }
      if (slab.minKm < 0 || slab.maxKm <= slab.minKm || slab.fee < 0) {
        throw new ApiError(400, `Invalid slab at index ${i}: minKm must be >= 0, maxKm > minKm, fee >= 0.`)
      }
      if (!slab.label || typeof slab.label !== 'string') {
        throw new ApiError(400, `Slab at index ${i} must have a valid string label.`)
      }
      if (i > 0 && slab.minKm < deliverySlabs[i - 1].minKm) {
        throw new ApiError(400, `Slabs must be ordered in ascending order of minKm.`)
      }
    }
    config.deliverySlabs = deliverySlabs
  }

  // 3. Platform fee percent
  if (platformFeePercent !== undefined) {
    const pFee = Number(platformFeePercent)
    if (isNaN(pFee) || pFee < 0 || pFee > 100) {
      throw new ApiError(400, 'platformFeePercent must be a number between 0 and 100.')
    }
    config.platformFeePercent = pFee
  }

  // 4. Delivery Partner Enabled toggle
  if (deliveryPartnerEnabled !== undefined) {
    config.deliveryPartnerEnabled = Boolean(deliveryPartnerEnabled)
  }

  // 5. Max service distance
  if (maxServiceDistanceKm !== undefined) {
    const maxDist = Number(maxServiceDistanceKm)
    if (isNaN(maxDist) || maxDist <= 0) {
      throw new ApiError(400, 'maxServiceDistanceKm must be a positive number greater than 0.')
    }
    config.maxServiceDistanceKm = maxDist
  }

  // 6. Free delivery threshold amount
  if (freeDeliveryThresholdAmount !== undefined) {
    const threshold = Number(freeDeliveryThresholdAmount)
    if (isNaN(threshold) || threshold < 0) {
      throw new ApiError(400, 'freeDeliveryThresholdAmount must be a non-negative number.')
    }
    config.freeDeliveryThresholdAmount = threshold
  }

  // 7. Minimum delivery fee
  if (minimumDeliveryFee !== undefined) {
    const minFee = Number(minimumDeliveryFee)
    if (isNaN(minFee) || minFee < 0) {
      throw new ApiError(400, 'minimumDeliveryFee must be a non-negative number.')
    }
    config.minimumDeliveryFee = minFee
  }

  config.updatedAt = new Date()
  await config.save()

  res.status(200).json({ success: true, message: 'Delivery configuration updated successfully.', config })
}

// ── PUT /api/delivery-fee/config/partner-toggle ──────────────────────────────
// Admin: toggle delivery partner availability on/off.
export const toggleDeliveryPartner = async (req, res) => {
  let config = await DeliveryConfig.findOne()
  if (!config) {
    config = new DeliveryConfig()
  }

  const { enabled } = req.body
  if (enabled !== undefined) {
    config.deliveryPartnerEnabled = Boolean(enabled)
  } else {
    config.deliveryPartnerEnabled = !config.deliveryPartnerEnabled
  }

  config.updatedAt = new Date()
  await config.save()

  res.status(200).json({
    success: true,
    message: `Delivery partner mode ${config.deliveryPartnerEnabled ? 'enabled' : 'disabled'}.`,
    deliveryPartnerEnabled: config.deliveryPartnerEnabled
  })
}
