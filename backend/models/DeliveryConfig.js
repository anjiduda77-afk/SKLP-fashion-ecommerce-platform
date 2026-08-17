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
    address: { type: String, default: 'SKLP Fashion, Hyderabad, Telangana, India' }
  },

  // Delivery fee slabs ordered by ascending distance
  deliverySlabs: {
    type: [deliverySlabSchema],
    default: [
      { minKm: 0,     maxKm: 5,     fee: 0,  label: 'Free delivery within 5 km 🎉' },
      { minKm: 5,     maxKm: 10,    fee: 20, label: 'Delivery charge: ₹20' },
      { minKm: 10,    maxKm: 20,    fee: 30, label: 'Delivery charge: ₹30' },
      { minKm: 20,    maxKm: 30,    fee: 40, label: 'Delivery charge: ₹40' },
      { minKm: 30,    maxKm: 99999, fee: 50, label: 'Delivery charge: ₹50' }
    ]
  },

  // Platform fee percentage applied on subtotal
  platformFeePercent: { type: Number, default: 5, min: 0, max: 100 },

  // Geocoding provider: 'nominatim' | 'google'
  geocodingProvider: { type: String, default: 'nominatim' },

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

// ── Singleton Helper ──────────────────────────────────────────────────────────
deliveryConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne().lean()
  if (!config) {
    // Auto-create defaults on first use
    const doc = await this.create({})
    config = doc.toObject()
  }
  return config
}

export default mongoose.model('DeliveryConfig', deliveryConfigSchema)
