import DeliveryConfig from '../models/DeliveryConfig.js'

// ── Coordinate Validation Helpers ─────────────────────────────────────────────
export const validateCoordinates = (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false
  if (lat < -90 || lat > 90) return false
  if (lng < -180 || lng > 180) return false
  // Reject (0, 0) as invalid null island coordinates
  if (lat === 0 && lng === 0) return false
  return true
}

export const isIndiaCoordinates = (lat, lng) => {
  if (!validateCoordinates(lat, lng)) return false
  // India approx bounding box: 6°N to 38°N, 68°E to 98°E
  return lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98
}

// ── Haversine Distance ─────────────────────────────────────────────────────────
// Returns straight-line distance in kilometres between two lat/lng coordinates.
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371 // Earth radius km
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return parseFloat((R * c).toFixed(1))
}

// ── OpenStreetMap Nominatim Geocoder ─────────────────────────────────────────
// Converts a postal address to { lat, lng } using Nominatim (free, no API key).
// Falls back to postalCode-only search if full address fails.
export const geocodeAddress = async (address) => {
  const { street, city, state, postalCode, country = 'India' } = address

  if (!city && !postalCode) {
    throw new Error('Address must have at least city or postal code for geocoding')
  }

  const buildQuery = (q) =>
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`

  // Strategy 1: full address
  const fullQuery = [street, city, state, postalCode, country].filter(Boolean).join(', ')
  
  // Strategy 2: city + postalCode + country (more reliable)
  const shortQuery = [city, state, postalCode, country].filter(Boolean).join(', ')

  const fetchCoords = async (query) => {
    const res = await fetch(buildQuery(query), {
      headers: { 'User-Agent': 'SKLP-Fashion-App/1.0 (sklp@fashion.com)' },
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
    const data = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  }

  let coords = null
  try {
    coords = await fetchCoords(shortQuery)
  } catch (e) {
    // try fallback
  }

  if (!coords) {
    try {
      coords = await fetchCoords(fullQuery)
    } catch (e) {
      // try PIN code fallback
    }
  }

  // Final fallback: postalCode only (PIN code lookup)
  if (!coords && postalCode) {
    try {
      coords = await fetchCoords(`${postalCode} India`)
    } catch (e) {
      // exhausted
    }
  }

  if (!coords) {
    throw new Error(
      `Could not determine location for address: ${city || ''}, ${postalCode || ''}. ` +
      'Please check city and PIN code.'
    )
  }

  return coords
}

// ── Fee from Slab ─────────────────────────────────────────────────────────────
// Returns the matching slab for a given distance in km.
export const getFeeFromSlabs = (distanceKm, slabs) => {
  if (!slabs || slabs.length === 0) {
    return { fee: 40, label: 'Standard delivery charge' }
  }
  const sorted = [...slabs].sort((a, b) => a.minKm - b.minKm)
  for (const slab of sorted) {
    if (distanceKm >= slab.minKm && distanceKm < slab.maxKm) {
      return { fee: slab.fee, label: slab.label }
    }
  }
  // Beyond all slabs — use the last slab's fee
  const last = sorted[sorted.length - 1]
  return { fee: last.fee, label: last.label }
}

// ── Main: Calculate Full Delivery Breakdown for a Specific Seller ────────────
export const calculateDeliveryBreakdownForSeller = async (
  shippingAddress,
  sellerLocation = null,
  config = null,
  subtotal = 0
) => {
  if (!config) {
    config = await DeliveryConfig.getConfig()
  }

  const {
    storeLocation,
    deliverySlabs,
    platformFeePercent,
    deliveryPartnerEnabled,
    maxServiceDistanceKm = 50,
    freeDeliveryThresholdAmount = 0,
    minimumDeliveryFee = 0
  } = config

  // Determine origin (seller shopLocation or default storeLocation)
  let originLocation = storeLocation || { lat: 17.3850, lng: 78.4867, address: 'SKLP Fashion, Hyderabad, Telangana, India' }
  if (sellerLocation && validateCoordinates(sellerLocation.lat, sellerLocation.lng)) {
    originLocation = {
      lat: sellerLocation.lat,
      lng: sellerLocation.lng,
      address: sellerLocation.address || `${sellerLocation.city || ''}, ${sellerLocation.state || ''}`.trim() || 'Seller Location'
    }
  }

  const deliveryMethod = deliveryPartnerEnabled ? 'delivery_partner' : 'self_delivery'

  // Geocode customer address
  let customerCoords
  try {
    customerCoords = await geocodeAddress(shippingAddress)
  } catch (err) {
    // Graceful fallback: if geocoding fails, apply fallback slab fee
    console.warn('[DeliveryUtils] Geocoding fallback active:', err.message)
    const slabs = deliverySlabs || []
    const maxSlab = [...slabs].sort((a, b) => b.minKm - a.minKm)[0]
    let fallbackFee = maxSlab ? maxSlab.fee : 50

    if (freeDeliveryThresholdAmount > 0 && subtotal >= freeDeliveryThresholdAmount) {
      fallbackFee = 0
    } else if (minimumDeliveryFee > 0 && fallbackFee > 0 && fallbackFee < minimumDeliveryFee) {
      fallbackFee = minimumDeliveryFee
    }

    return {
      distanceKm: null,
      geocodingFailed: true,
      deliveryUnavailable: false,
      deliveryFee: fallbackFee,
      deliveryLabel: fallbackFee === 0
        ? 'Free delivery 🎉'
        : (maxSlab ? maxSlab.label : 'Standard delivery charge: ₹50') + ' (location estimate)',
      platformFeePercent: platformFeePercent ?? 5,
      originAddress: originLocation.address,
      storeAddress: originLocation.address,
      deliveryMethod
    }
  }

  const distanceKm = haversineDistance(
    originLocation.lat,
    originLocation.lng,
    customerCoords.lat,
    customerCoords.lng
  )

  // Check maximum serviceable distance
  if (maxServiceDistanceKm && distanceKm > maxServiceDistanceKm) {
    return {
      distanceKm,
      geocodingFailed: false,
      deliveryUnavailable: true,
      deliveryFee: 0,
      deliveryLabel: `Delivery unavailable: distance (${distanceKm} km) exceeds service limit (${maxServiceDistanceKm} km)`,
      platformFeePercent: platformFeePercent ?? 5,
      originAddress: originLocation.address,
      storeAddress: originLocation.address,
      customerCoords,
      deliveryMethod
    }
  }

  let { fee: deliveryFee, label: deliveryLabel } = getFeeFromSlabs(distanceKm, deliverySlabs)

  // Free delivery threshold override
  if (freeDeliveryThresholdAmount > 0 && subtotal >= freeDeliveryThresholdAmount) {
    deliveryFee = 0
    deliveryLabel = `Free delivery for orders above ₹${freeDeliveryThresholdAmount} 🎉`
  } else {
    // Minimum fee floor
    if (deliveryFee > 0 && minimumDeliveryFee > 0 && deliveryFee < minimumDeliveryFee) {
      deliveryFee = minimumDeliveryFee
      deliveryLabel = `Delivery charge: ₹${minimumDeliveryFee}`
    }
  }

  return {
    distanceKm,
    geocodingFailed: false,
    deliveryUnavailable: false,
    deliveryFee,
    deliveryLabel,
    platformFeePercent: platformFeePercent ?? 5,
    originAddress: originLocation.address,
    storeAddress: originLocation.address,
    customerCoords,
    deliveryMethod
  }
}

// ── Backward-Compatible calculateDeliveryBreakdown ─────────────────────────────
export const calculateDeliveryBreakdown = async (shippingAddress, subtotal = 0) => {
  return calculateDeliveryBreakdownForSeller(shippingAddress, null, null, subtotal)
}
