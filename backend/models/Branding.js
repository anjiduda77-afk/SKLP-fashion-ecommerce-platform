import mongoose from 'mongoose'

// ── Branding Schema ───────────────────────────────────────────────────────────
// Singleton document — there is EXACTLY ONE document in this collection.
// Admins update it via the Admin Settings panel without touching code.
const brandingSchema = new mongoose.Schema({
  // Platform display name (used on all documents)
  brandName: { type: String, default: 'STYLE STREET', trim: true },

  // Tagline shown below brand name on receipts
  tagline: { type: String, default: 'Luxury Fashion Marketplace', trim: true },

  // Main logo (hero, home page, large display)
  mainLogo: {
    url:      { type: String, default: '' },
    publicId: { type: String, default: '' }
  },

  // Logo used on Order Receipt & Tax Invoice (high-quality, colour)
  receiptLogo: {
    url:      { type: String, default: '' },
    publicId: { type: String, default: '' }
  },

  // Logo used on Shipping / Packing Label (high contrast, suitable for B&W print)
  shippingLogo: {
    url:      { type: String, default: '' },
    publicId: { type: String, default: '' }
  },

  // Logo for transactional emails
  emailLogo: {
    url:      { type: String, default: '' },
    publicId: { type: String, default: '' }
  },

  // Favicon / PWA icon
  favicon: {
    url:      { type: String, default: '' },
    publicId: { type: String, default: '' }
  },

  // Primary brand colour (hex) used as accent on documents
  primaryColor: { type: String, default: '#B8860B', trim: true },

  // Secondary / accent colour
  secondaryColor: { type: String, default: '#1a1a1a', trim: true },

  // Contact details printed on receipts
  supportEmail:  { type: String, default: 'support@stylestreet.in', trim: true },
  supportPhone:  { type: String, default: '', trim: true },
  websiteUrl:    { type: String, default: 'https://stylestreet.in', trim: true },

  // Registered office / return address printed on receipts / invoices
  registeredAddress: {
    street:  { type: String, default: '' },
    city:    { type: String, default: 'Hyderabad' },
    state:   { type: String, default: 'Telangana' },
    pincode: { type: String, default: '500001' },
    country: { type: String, default: 'India' }
  },

  // GST / Tax registration number (printed on Tax Invoice)
  gstin: { type: String, default: '', trim: true },

  // Shipping declaration / footer text on receipts
  receiptFooterText: {
    type: String,
    default: 'Thank you for shopping with Style Street — India\'s premier luxury fashion destination.'
  }
}, { timestamps: true })

// ── Singleton Helper ──────────────────────────────────────────────────────────
brandingSchema.statics.getConfig = async function () {
  let config = await this.findOne()
  if (!config) {
    config = await this.create({})
  }
  return config.toObject ? config.toObject() : config
}

export default mongoose.model('Branding', brandingSchema)
