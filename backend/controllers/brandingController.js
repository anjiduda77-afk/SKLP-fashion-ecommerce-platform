import Branding from '../models/Branding.js'
import { uploadImage, deleteImage, isCloudinaryConfigured } from '../config/cloudinary.js'
import { ApiError } from '../middleware/errorHandler.js'

// ── Logo field map ────────────────────────────────────────────────────────────
// Maps ?logoType query-param values to Branding document field names.
const LOGO_FIELDS = {
  mainLogo:     'mainLogo',
  receiptLogo:  'receiptLogo',
  shippingLogo: 'shippingLogo',
  emailLogo:    'emailLogo',
  favicon:      'favicon'
}

// ── GET /api/branding  (public – no auth needed) ──────────────────────────────
export const getBranding = async (req, res) => {
  const branding = await Branding.getConfig()
  res.status(200).json({ success: true, branding })
}

// ── GET /api/admin/branding  (admin-only, same data) ─────────────────────────
export const getAdminBranding = async (req, res) => {
  const branding = await Branding.getConfig()
  res.status(200).json({ success: true, branding })
}

// ── PUT /api/admin/branding  — update text fields ─────────────────────────────
export const updateBranding = async (req, res) => {
  const allowedFields = [
    'brandName', 'tagline', 'primaryColor', 'secondaryColor',
    'supportEmail', 'supportPhone', 'websiteUrl', 'gstin',
    'receiptFooterText', 'registeredAddress'
  ]

  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided to update')
  }

  let branding = await Branding.findOne()
  if (!branding) {
    branding = await Branding.create(updates)
  } else {
    Object.assign(branding, updates)
    await branding.save()
  }

  res.status(200).json({
    success: true,
    message: 'Branding settings updated successfully',
    branding: branding.toObject()
  })
}

// ── POST /api/admin/branding/logo  — upload / replace a logo ─────────────────
// Body: multipart/form-data with field 'logo' + query param ?logoType=receiptLogo
export const uploadBrandingLogo = async (req, res) => {
  const { logoType } = req.query

  if (!logoType || !LOGO_FIELDS[logoType]) {
    throw new ApiError(
      400,
      `Invalid logoType. Must be one of: ${Object.keys(LOGO_FIELDS).join(', ')}`
    )
  }

  if (!req.file) {
    throw new ApiError(400, 'No logo image provided')
  }

  const fieldName = LOGO_FIELDS[logoType]

  // Fetch existing record to get old publicId for cleanup
  let branding = await Branding.findOne()
  if (!branding) branding = await Branding.create({})

  const oldPublicId = branding[fieldName]?.publicId

  let result
  if (isCloudinaryConfigured()) {
    // Delete old logo from Cloudinary if it exists
    if (oldPublicId && !oldPublicId.startsWith('local_')) {
      try { await deleteImage(oldPublicId) } catch (e) {
        console.warn('[Branding] Failed to delete old logo from Cloudinary:', e.message)
      }
    }

    result = await uploadImage(req.file.buffer, {
      folder: 'branding',
      width: 600,
      publicId: `branding_${logoType}_${Date.now()}`
    })
  } else {
    console.warn('[Branding] Cloudinary not configured — using base64 fallback')
    result = {
      url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      publicId: `local_branding_${logoType}_${Date.now()}`
    }
  }

  branding[fieldName] = { url: result.url, publicId: result.publicId }
  await branding.save()

  res.status(200).json({
    success: true,
    message: `${logoType} uploaded successfully`,
    logo: { url: result.url, publicId: result.publicId },
    logoType
  })
}

// ── DELETE /api/admin/branding/logo?logoType=receiptLogo ─────────────────────
export const deleteBrandingLogo = async (req, res) => {
  const { logoType } = req.query

  if (!logoType || !LOGO_FIELDS[logoType]) {
    throw new ApiError(
      400,
      `Invalid logoType. Must be one of: ${Object.keys(LOGO_FIELDS).join(', ')}`
    )
  }

  const fieldName = LOGO_FIELDS[logoType]

  const branding = await Branding.findOne()
  if (!branding) {
    return res.status(200).json({ success: true, message: 'Nothing to remove' })
  }

  const publicId = branding[fieldName]?.publicId
  if (publicId && !publicId.startsWith('local_') && isCloudinaryConfigured()) {
    try { await deleteImage(publicId) } catch (e) {
      console.warn('[Branding] Failed to remove logo from Cloudinary:', e.message)
    }
  }

  branding[fieldName] = { url: '', publicId: '' }
  await branding.save()

  res.status(200).json({
    success: true,
    message: `${logoType} removed successfully`,
    logoType
  })
}
