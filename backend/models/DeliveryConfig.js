import mongoose from 'mongoose'

// ── Delivery Slab Schema ──────────────────────────────────────────────────────
const deliverySlabSchema = new mongoose.Schema({
  minKm: { type: Number, required: true },   // inclusive lower bound
  maxKm: { type: Number, required: true },   // exclusive upper bound (use Infinity sentinel: 99999)
  fee:   { type: Number, required: true, min: 0 },
  label: { type: String, required: true }    // human-readable label shown to customers
}, { _id: false })

// ── DeliveryConfig Schema ─────────────────────────────────────────────────────
// There should be EXACTLY ONE document in this collection (singleton config).
// Admins can update it via the Admin panel without touching code.
const deliveryConfigSchema = new mongoose.Schema({
  // SKLP dispatch / store coordinates (source of distance calculation)
  storeLocation: {
    lat:     { type: Number, default: 17.3850 },   // Hyderabad, Telangana
    lng:     { type: Number, default: 78.4867 },
    address: { type: String, default: 'Style Street Fashion, Hyderabad, Telangana, India' }
  },

  // Delivery fee slabs ordered by ascending distance
  deliverySlabs: {
    type: [deliverySlabSchema],
    default: [
      { minKm: 0,    maxKm: 6.0,   fee: 10, label: 'Delivery charge: ₹10 (0 - 6 km)' },
      { minKm: 6.0,  maxKm: 12.0,  fee: 20, label: 'Delivery charge: ₹20 (6 - 12 km)' },
      { minKm: 12.0, maxKm: 40.0,  fee: 30, label: 'Delivery charge: ₹30 (12 - 40 km)' },
      { minKm: 40.0, maxKm: 99999, fee: 50, label: 'Delivery charge: ₹50 (>40 km)' }
    ]
  },

  // Delivery Partner toggle (controlled by Admin)
  // false = Self Delivery only; true = Self Delivery or Delivery Partner
  deliveryPartnerEnabled: { type: Boolean, default: false },

  // Maximum serviceable distance in kilometers (beyond this = delivery unavailable; 4000km covers all India)
  maxServiceDistanceKm: { type: Number, default: 4000, min: 1 },

  // Cart subtotal threshold for automatic free delivery (0 = disabled)
  freeDeliveryThresholdAmount: { type: Number, default: 0, min: 0 },

  // Floor on delivery fee (minimum fee charged unless free delivery applies)
  minimumDeliveryFee: { type: Number, default: 0, min: 0 },

  // Platform fee percentage applied on subtotal
  platformFeePercent: { type: Number, default: 5, min: 0, max: 100 },

  // Geocoding provider: 'nominatim' | 'google'
  geocodingProvider: { type: String, default: 'nominatim' },

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

// ── Singleton Helper ──────────────────────────────────────────────────────────
deliveryConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne()
  if (!config) {
    // Auto-create defaults on first use
    config = await this.create({})
  }
  const obj = config.toObject ? config.toObject() : config
  if (obj.deliveryPartnerEnabled === undefined) obj.deliveryPartnerEnabled = false
  if (obj.maxServiceDistanceKm === undefined) obj.maxServiceDistanceKm = 4000
  if (obj.freeDeliveryThresholdAmount === undefined) obj.freeDeliveryThresholdAmount = 0
  if (obj.minimumDeliveryFee === undefined) obj.minimumDeliveryFee = 0
  return obj
}

export default mongoose.model('DeliveryConfig', deliveryConfigSchema)
