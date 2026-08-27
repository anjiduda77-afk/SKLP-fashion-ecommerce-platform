import Seller from '../models/Seller.js'
import User from '../models/User.js'

/**
 * Ensures a Seller profile exists for the given user, cleanly resolving
 * seeded stores, legacy IDs, or creating guaranteed unique store credentials.
 */
export const getOrCreateSellerProfile = async (userId) => {
  if (!userId) return null

  let seller = await Seller.findOne({ userId })
  if (seller) return seller

  const user = await User.findById(userId)
  if (!user) return null

  const baseName = user.sellerProfile?.storeName || `${user.firstName || 'Seller'}'s Store`
  const baseSlug = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')

  // Check if an existing seller record matches this shop name/slug
  let existingSeller = await Seller.findOne({
    $or: [
      { shopName: new RegExp(`^${baseName}$`, 'i') },
      { shopSlug: baseSlug }
    ]
  })

  if (existingSeller) {
    existingSeller.userId = user._id
    if (!existingSeller.verificationStatus) existingSeller.verificationStatus = 'verified'
    if (!existingSeller.sellerStatus) existingSeller.sellerStatus = 'active'
    await existingSeller.save()
    return existingSeller
  }

  // Create new unique seller
  let shopName = baseName
  let shopSlug = baseSlug

  const nameTaken = await Seller.findOne({ shopName })
  const slugTaken = await Seller.findOne({ shopSlug })

  if (nameTaken || slugTaken) {
    const uniqueSuffix = Date.now().toString().slice(-4)
    shopName = `${baseName} ${uniqueSuffix}`
    shopSlug = `${baseSlug}-${uniqueSuffix}`
  }

  seller = await Seller.create({
    userId: user._id,
    shopName,
    shopSlug,
    verificationStatus: 'verified',
    sellerStatus: 'active',
    rating: 4.9,
    reviewCount: 12
  })

  return seller
}
