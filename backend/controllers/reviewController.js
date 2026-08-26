import mongoose from 'mongoose'
import Review from '../models/Review.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'
import { resolveProductDocument } from './productController.js'

/**
 * Recalculate average rating & review count for a product (Approved reviews only)
 */
export const recalculateProductRating = async (productId) => {
  try {
    const stats = await Review.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          status: 'APPROVED'
        }
      },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ])

    if (stats.length > 0) {
      const avg = Math.round(stats[0].averageRating * 10) / 10
      await Product.findByIdAndUpdate(productId, {
        rating: avg,
        reviewCount: stats[0].reviewCount
      })
    } else {
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviewCount: 0
      })
    }
  } catch (err) {
    console.error('Failed to recalculate product rating:', err.message)
  }
}

/**
 * GET /api/products/:id/reviews
 * Public endpoint: Returns approved reviews with rating statistics and filter/sort options
 */
export const getProductReviews = async (req, res) => {
  const { id: productId } = req.params
  const {
    page = 1,
    limit = 10,
    rating,
    verified,
    withPhotos,
    sort = 'most_helpful'
  } = req.query

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10))

  const product = await resolveProductDocument(productId)
  if (!product) {
    return res.status(200).json({
      success: true,
      reviews: [],
      pagination: { total: 0, page: pageNum, limit: limitNum, pages: 1 },
      stats: {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        ratingPercentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recommendedPercentage: 100,
        fitSummary: { runsSmall: 0, trueToSize: 100, runsLarge: 0, totalResponses: 0 },
        photoCount: 0,
        allPhotos: []
      }
    })
  }

  // Only approved reviews are visible to the public
  const query = {
    productId: product._id,
    status: 'APPROVED'
  }

  if (rating && !isNaN(Number(rating))) {
    query.rating = Number(rating)
  }

  if (verified === 'true') {
    query.verifiedPurchase = true
  }

  if (withPhotos === 'true') {
    query['images.0'] = { $exists: true }
  }

  // Sort order
  let sortOption = { createdAt: -1 }
  if (sort === 'most_helpful') {
    sortOption = { helpfulCount: -1, createdAt: -1 }
  } else if (sort === 'highest_rating') {
    sortOption = { rating: -1, createdAt: -1 }
  } else if (sort === 'lowest_rating') {
    sortOption = { rating: 1, createdAt: -1 }
  } else if (sort === 'newest') {
    sortOption = { createdAt: -1 }
  } else if (sort === 'oldest') {
    sortOption = { createdAt: 1 }
  }

  // Parallel database execution
  const [reviews, totalCount, allApprovedReviews] = await Promise.all([
    Review.find(query)
      .populate('userId', 'firstName lastName avatar')
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Review.countDocuments(query),
    Review.find({ productId: product._id, status: 'APPROVED' })
      .select('rating fitFeedback images verifiedPurchase createdAt')
      .lean()
  ])

  // Aggregate stats across all approved reviews for this product
  const totalReviews = allApprovedReviews.length
  let totalRatingSum = 0
  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const fitCounts = { runs_small: 0, true_to_size: 0, runs_large: 0, not_specified: 0 }
  const allPhotos = []

  allApprovedReviews.forEach((rev) => {
    totalRatingSum += rev.rating || 0
    if (ratingBreakdown[rev.rating] !== undefined) {
      ratingBreakdown[rev.rating] += 1
    }
    if (fitCounts[rev.fitFeedback] !== undefined) {
      fitCounts[rev.fitFeedback] += 1
    }
    if (Array.isArray(rev.images) && rev.images.length > 0) {
      rev.images.forEach((img) => {
        if (img?.url) {
          allPhotos.push({
            url: img.url,
            reviewId: rev._id,
            rating: rev.rating
          })
        }
      })
    }
  })

  const averageRating = totalReviews > 0 ? (totalRatingSum / totalReviews).toFixed(1) : '0.0'
  const recommendedCount = (ratingBreakdown[4] || 0) + (ratingBreakdown[5] || 0)
  const recommendedPercentage = totalReviews > 0 ? Math.round((recommendedCount / totalReviews) * 100) : 100

  const ratingPercentages = {
    5: totalReviews > 0 ? Math.round((ratingBreakdown[5] / totalReviews) * 100) : 0,
    4: totalReviews > 0 ? Math.round((ratingBreakdown[4] / totalReviews) * 100) : 0,
    3: totalReviews > 0 ? Math.round((ratingBreakdown[3] / totalReviews) * 100) : 0,
    2: totalReviews > 0 ? Math.round((ratingBreakdown[2] / totalReviews) * 100) : 0,
    1: totalReviews > 0 ? Math.round((ratingBreakdown[1] / totalReviews) * 100) : 0
  }

  const totalFitResponses = totalReviews - fitCounts.not_specified
  const fitSummary = {
    runsSmall: totalFitResponses > 0 ? Math.round((fitCounts.runs_small / totalFitResponses) * 100) : 0,
    trueToSize: totalFitResponses > 0 ? Math.round((fitCounts.true_to_size / totalFitResponses) * 100) : 100,
    runsLarge: totalFitResponses > 0 ? Math.round((fitCounts.runs_large / totalFitResponses) * 100) : 0,
    totalResponses: totalFitResponses
  }

  const currentUserId = req.user?.id ? req.user.id.toString() : null
  const formattedReviews = reviews.map((rev) => {
    const isOwner = currentUserId && rev.userId?._id?.toString() === currentUserId
    const hasVotedHelpful = currentUserId && rev.helpfulUsers?.some((u) => u?.toString() === currentUserId)

    const firstName = rev.userId?.firstName || ''
    const lastName = rev.userId?.lastName || ''
    const displayName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (rev.reviewerName || 'SKLP Customer')

    return {
      _id: rev._id,
      productId: rev.productId,
      orderId: rev.orderId,
      rating: rev.rating,
      title: rev.title || '',
      comment: rev.comment,
      fitFeedback: rev.fitFeedback,
      images: rev.images || [],
      verifiedPurchase: Boolean(rev.verifiedPurchase),
      status: rev.status,
      helpfulCount: rev.helpfulCount || (rev.helpfulUsers?.length || 0),
      sellerResponse: rev.sellerResponse || null,
      createdAt: rev.createdAt,
      updatedAt: rev.updatedAt,
      reviewer: {
        id: rev.userId?._id || null,
        name: displayName,
        avatar: rev.userId?.avatar?.url || rev.userId?.avatar || rev.reviewerAvatar || ''
      },
      isOwner: Boolean(isOwner),
      userVote: hasVotedHelpful ? 'helpful' : null
    }
  })

  res.status(200).json({
    success: true,
    reviews: formattedReviews,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalCount / limitNum) || 1
    },
    stats: {
      averageRating: parseFloat(averageRating),
      totalReviews,
      ratingBreakdown,
      ratingPercentages,
      recommendedPercentage,
      fitSummary,
      photoCount: allPhotos.length,
      allPhotos: allPhotos.slice(0, 20)
    }
  })
}

/**
 * GET /api/products/:id/reviews/eligibility
 * Check if the authenticated customer can review (delivered purchase required)
 */
export const checkReviewEligibility = async (req, res) => {
  const { id: productId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  const product = await resolveProductDocument(productId)
  if (!product) {
    throw new ApiError(404, 'Product not found')
  }
  const targetProductId = product._id

  // Check role: Only customers can write product reviews
  if (userRole !== 'customer' && userRole !== 'admin') {
    return res.status(200).json({
      success: true,
      canReview: false,
      reason: 'Only customer accounts can submit product reviews.',
      isVerifiedPurchase: false,
      existingReview: null
    })
  }

  // Check if customer already submitted a review
  const existingReview = await Review.findOne({ productId: targetProductId, userId }).lean()

  // Verify delivered purchase
  const deliveredOrder = await Order.findOne({
    userId,
    'items.productId': targetProductId,
    status: 'delivered'
  }).select('_id orderNumber createdAt').lean()

  if (!deliveredOrder) {
    return res.status(200).json({
      success: true,
      canReview: false,
      reason: 'Only customers with a successfully delivered order containing this item can submit a review.',
      isVerifiedPurchase: false,
      existingReview: existingReview || null,
      product: {
        id: product._id,
        name: product.name,
        brand: product.brand,
        image: product.images?.[0]?.url || ''
      }
    })
  }

  res.status(200).json({
    success: true,
    canReview: true,
    hasReviewed: Boolean(existingReview),
    isVerifiedPurchase: true,
    orderId: deliveredOrder._id,
    orderNumber: deliveredOrder.orderNumber,
    existingReview: existingReview || null,
    product: {
      id: product._id,
      name: product.name,
      brand: product.brand,
      image: product.images?.[0]?.url || ''
    }
  })
}

/**
 * POST /api/products/:id/reviews
 * Customer submits a review (Requires delivered order verification)
 */
export const createOrUpdateReview = async (req, res) => {
  const { id: productId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  // Enforce customer account role
  if (userRole !== 'customer' && userRole !== 'admin') {
    throw new ApiError(403, 'Only customer accounts can submit reviews.')
  }

  const {
    rating,
    title = '',
    comment,
    fitFeedback = 'not_specified',
    images = []
  } = req.body

  // Validation: Rating (1-5)
  const numericRating = Number(rating)
  if (!numericRating || numericRating < 1 || numericRating > 5 || !Number.isInteger(numericRating)) {
    throw new ApiError(400, 'Rating is required and must be an integer between 1 and 5 stars.')
  }

  // Validation: Review comment (4 to 2000 characters)
  if (!comment || typeof comment !== 'string' || comment.trim().length < 4) {
    throw new ApiError(400, 'Review comment must be at least 4 characters.')
  }
  if (comment.trim().length > 2000) {
    throw new ApiError(400, 'Review comment cannot exceed 2000 characters.')
  }

  // Validation: Title (Optional, max 120 chars)
  const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 120) : ''

  // Validation: Images (Max 5 images)
  let cleanImages = []
  if (Array.isArray(images)) {
    if (images.length > 5) {
      throw new ApiError(400, 'You can attach up to 5 images per review.')
    }
    cleanImages = images.map((img) => ({
      url: typeof img === 'string' ? img : img.url,
      publicId: typeof img === 'object' ? img.publicId || null : null,
      uploadedAt: new Date()
    })).filter((img) => Boolean(img.url))
  }

  // Verify Product exists
  const product = await resolveProductDocument(productId)
  if (!product) {
    throw new ApiError(404, 'Product not found')
  }
  const targetProductId = product._id

  // Strict backend verification: User must have a delivered order for this product
  const deliveredOrder = await Order.findOne({
    userId,
    'items.productId': targetProductId,
    status: 'delivered'
  }).select('_id')

  if (!deliveredOrder) {
    throw new ApiError(403, 'Review rejected: Only customers with a successfully delivered order for this product can submit a review.')
  }

  // Fetch user details for display snapshot
  const user = await User.findById(userId).select('firstName lastName avatar')
  const reviewerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Verified Customer' : 'Verified Customer'
  const reviewerAvatar = user?.avatar?.url || user?.avatar || ''

  // Upsert review (1 review per customer per product)
  let review = await Review.findOne({ productId: targetProductId, userId })

  if (review) {
    review.orderId = deliveredOrder._id
    review.rating = numericRating
    review.title = cleanTitle
    review.comment = comment.trim()
    review.fitFeedback = fitFeedback
    review.images = cleanImages
    review.verifiedPurchase = true
    review.status = 'APPROVED'
    review.reviewerName = reviewerName
    review.reviewerAvatar = reviewerAvatar
    review.updatedAt = new Date()
    await review.save()
  } else {
    review = await Review.create({
      productId: targetProductId,
      userId,
      orderId: deliveredOrder._id,
      rating: numericRating,
      title: cleanTitle,
      comment: comment.trim(),
      fitFeedback,
      images: cleanImages,
      verifiedPurchase: true,
      status: 'APPROVED',
      reviewerName,
      reviewerAvatar
    })
  }

  // Recalculate product rating & count
  await recalculateProductRating(targetProductId)

  res.status(201).json({
    success: true,
    message: 'Thank you! Your review has been submitted successfully.',
    review: {
      _id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images,
      verifiedPurchase: review.verifiedPurchase,
      status: review.status,
      createdAt: review.createdAt
    }
  })
}

/**
 * PUT /api/products/:id/reviews/:reviewId
 * Edit own review
 */
export const updateReview = async (req, res) => {
  const { id: productId, reviewId } = req.params
  const userId = req.user.id

  const review = await Review.findById(reviewId)
  if (!review) {
    throw new ApiError(404, 'Review not found')
  }

  // Authorization: Only owner can edit
  if (review.userId.toString() !== userId) {
    throw new ApiError(403, 'Unauthorized: You can only edit your own review.')
  }

  const { rating, title = '', comment, fitFeedback, images } = req.body

  if (rating) {
    const num = Number(rating)
    if (num < 1 || num > 5) throw new ApiError(400, 'Rating must be between 1 and 5.')
    review.rating = num
  }

  if (comment) {
    if (comment.trim().length < 4 || comment.trim().length > 2000) {
      throw new ApiError(400, 'Review comment must be between 4 and 2000 characters.')
    }
    review.comment = comment.trim()
  }

  if (title !== undefined) {
    review.title = typeof title === 'string' ? title.trim().slice(0, 120) : ''
  }

  if (fitFeedback) {
    review.fitFeedback = fitFeedback
  }

  if (Array.isArray(images)) {
    if (images.length > 5) throw new ApiError(400, 'Maximum 5 images allowed.')
    review.images = images.map(img => ({
      url: typeof img === 'string' ? img : img.url,
      publicId: typeof img === 'object' ? img.publicId || null : null,
      uploadedAt: new Date()
    }))
  }

  review.updatedAt = new Date()
  await review.save()

  // Recalculate product rating
  await recalculateProductRating(productId)

  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    review
  })
}

/**
 * DELETE /api/products/:id/reviews/:reviewId
 * Customer deletes own review or Admin deletes
 */
export const deleteReview = async (req, res) => {
  const { id: productId, reviewId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  const review = await Review.findById(reviewId)
  if (!review) {
    throw new ApiError(404, 'Review not found')
  }

  // Authorization: Owner or Admin
  if (review.userId.toString() !== userId && userRole !== 'admin') {
    throw new ApiError(403, 'Unauthorized: You are not authorized to delete this review.')
  }

  await Review.findByIdAndDelete(reviewId)

  // Recalculate product rating
  await recalculateProductRating(productId)

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  })
}

/**
 * POST /api/products/:id/reviews/:reviewId/helpful
 * Vote helpful on a review
 */
export const voteReviewHelpful = async (req, res) => {
  const { reviewId } = req.params
  const userId = req.user.id

  const review = await Review.findById(reviewId)
  if (!review) {
    throw new ApiError(404, 'Review not found')
  }

  // Prevent author from voting on their own review
  if (review.userId.toString() === userId) {
    throw new ApiError(400, 'You cannot vote on your own review.')
  }

  if (!review.helpfulUsers) review.helpfulUsers = []

  const hasVoted = review.helpfulUsers.some((u) => u.toString() === userId)
  let userVote = null

  if (hasVoted) {
    // Toggle off
    review.helpfulUsers = review.helpfulUsers.filter((u) => u.toString() !== userId)
    userVote = null
  } else {
    // Add vote
    review.helpfulUsers.push(userId)
    userVote = 'helpful'
  }

  review.helpfulCount = review.helpfulUsers.length
  await review.save()

  res.status(200).json({
    success: true,
    helpfulCount: review.helpfulCount,
    userVote
  })
}

/**
 * POST /api/products/:id/reviews/:reviewId/reply
 * Seller or Admin official response to review
 */
export const replyToReview = async (req, res) => {
  const { reviewId } = req.params
  const userId = req.user.id
  const userRole = req.user.role
  const { message, responderName } = req.body

  if (!['admin', 'seller'].includes(userRole)) {
    throw new ApiError(403, 'Only sellers and administrators can reply to reviews.')
  }

  if (!message || !message.trim()) {
    throw new ApiError(400, 'Response message cannot be empty.')
  }

  const review = await Review.findById(reviewId)
  if (!review) {
    throw new ApiError(404, 'Review not found')
  }

  review.sellerResponse = {
    message: message.trim(),
    respondedAt: new Date(),
    respondedByName: responderName || (userRole === 'admin' ? 'SKLP Official Team' : 'Verified Seller'),
    respondedBy: userId
  }

  await review.save()

  res.status(200).json({
    success: true,
    message: 'Official response posted successfully',
    sellerResponse: review.sellerResponse
  })
}
