import DeliveryConfig from '../models/DeliveryConfig.js'

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

// ── Main: Calculate Full Delivery Breakdown ────────────────────────────────────
// This is the single entry point used by both the /delivery-fee/calculate API
// and the createOrder controller. Always runs server-side.
export const calculateDeliveryBreakdown = async (shippingAddress) => {
  const config = await DeliveryConfig.getConfig()
  const { storeLocation, deliverySlabs, platformFeePercent } = config

  // Geocode customer address
  let customerCoords
  try {
    customerCoords = await geocodeAddress(shippingAddress)
  } catch (err) {
    // Graceful fallback: if geocoding fails, apply maximum slab fee for safety
    console.warn('[DeliveryUtils] Geocoding fallback active:', err.message)
    const slabs = deliverySlabs || []
    const maxSlab = [...slabs].sort((a, b) => b.minKm - a.minKm)[0]
    return {
      distanceKm: null,
      geocodingFailed: true,
      deliveryFee: maxSlab ? maxSlab.fee : 50,
      deliveryLabel: (maxSlab ? maxSlab.label : 'Standard delivery charge: ₹50') + ' (location estimate)',
      platformFeePercent: platformFeePercent ?? 5,
      storeAddress: storeLocation?.address || 'SKLP Fashion, Hyderabad, Telangana, India'
    }
  }

  const distanceKm = haversineDistance(
    storeLocation.lat,
    storeLocation.lng,
    customerCoords.lat,
    customerCoords.lng
  )

  const { fee: deliveryFee, label: deliveryLabel } = getFeeFromSlabs(distanceKm, deliverySlabs)

  return {
    distanceKm,
    geocodingFailed: false,
    deliveryFee,
    deliveryLabel,
    platformFeePercent,
    storeAddress: storeLocation.address,
    customerCoords
  }
}
