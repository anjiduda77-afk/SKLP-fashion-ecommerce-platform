import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiStar,
  FiCheckCircle,
  FiThumbsUp,
  FiThumbsDown,
  FiCamera,
  FiFilter,
  FiEdit3,
  FiTrash2,
  FiX,
  FiImage,
  FiMessageSquare,
  FiUploadCloud,
  FiAward,
  FiChevronDown
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useAuth } from '@context/AuthContext'
import { reviewService, uploadService } from '@services/apiServices'

export const ProductReviews = ({ productId, productName, isDarkMode = true }) => {
  const { user, isAuthenticated } = useAuth()

  // State: Reviews & Aggregated Stats
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({
    averageRating: 5.0,
    totalReviews: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    ratingPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    recommendedPercentage: 100,
    fitSummary: { runsSmall: 0, trueToSize: 100, runsLarge: 0, totalResponses: 0 },
    allPhotos: []
  })
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })

  // Filters & Sorting
  const [selectedRating, setSelectedRating] = useState(null)
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false)
  const [sortBy, setSortBy] = useState('most_helpful')

  // Review Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [eligibility, setEligibility] = useState(null)
  const [formRating, setFormRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [formTitle, setFormTitle] = useState('')
  const [formComment, setFormComment] = useState('')
  const [formFit, setFormFit] = useState('true_to_size')
  const [formImages, setFormImages] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  // Photo Zoom Lightbox
  const [lightboxImage, setLightboxImage] = useState(null)

  // Seller Reply Modal State
  const [replyModalReview, setReplyModalReview] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  // Fetch reviews from backend
  const fetchReviews = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 8,
        sort: sortBy,
        ...(selectedRating && { rating: selectedRating }),
        ...(onlyVerified && { verified: 'true' }),
        ...(onlyWithPhotos && { withPhotos: 'true' })
      }

      const res = await reviewService.getReviews(productId, params)
      if (res.data?.success) {
        setReviews(res.data.reviews || [])
        setPagination(res.data.pagination || { page: 1, limit: 8, total: 0, pages: 1 })
        if (res.data.stats) {
          setStats(res.data.stats)
        }
      }
    } catch (err) {
      console.warn('Failed to load reviews:', err.message)
    } finally {
      setLoading(false)
    }
  }, [productId, sortBy, selectedRating, onlyVerified, onlyWithPhotos])

  useEffect(() => {
    if (productId) {
      fetchReviews(1)
    }
  }, [fetchReviews, productId])

  // Check eligibility for writing a review
  const handleOpenReviewModal = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to share your review and experience.')
      return
    }

    try {
      const res = await reviewService.checkEligibility(productId)
      if (res.data?.success) {
        setEligibility(res.data)
        if (res.data.existingReview) {
          const rev = res.data.existingReview
          setFormRating(rev.rating || 5)
          setFormTitle(rev.title || '')
          setFormComment(rev.comment || '')
          setFormFit(rev.fitFeedback || 'true_to_size')
          setFormImages(rev.images || [])
        } else {
          setFormRating(5)
          setFormTitle('')
          setFormComment('')
          setFormFit('true_to_size')
          setFormImages([])
        }
        setIsModalOpen(true)
      }
    } catch (err) {
      toast.error('Unable to open review form. Please try again.')
    }
  }

  // Handle Photo Upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (formImages.length + files.length > 5) {
      toast.warning('You can attach up to 5 photos per review.')
      return
    }

    try {
      setUploadingImages(true)
      const res = await uploadService.uploadImages(files)
      if (res.data?.success && Array.isArray(res.data.images)) {
        setFormImages((prev) => [...prev, ...res.data.images])
        toast.success(`${files.length} photo(s) uploaded!`)
      }
    } catch (err) {
      toast.error('Failed to upload photos. Please try again.')
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemovePhoto = (idx) => {
    setFormImages((prev) => prev.filter((_, i) => i !== idx))
  }

  // Submit Review Form
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!formComment.trim() || formComment.trim().length < 4) {
      toast.error('Please provide detailed review feedback (at least 4 characters)')
      return
    }
    if (formComment.trim().length > 2000) {
      toast.error('Review comment cannot exceed 2000 characters')
      return
    }

    try {
      setSubmittingReview(true)
      const payload = {
        rating: formRating,
        title: formTitle,
        comment: formComment,
        fitFeedback: formFit,
        images: formImages
      }

      const res = await reviewService.createOrUpdateReview(productId, payload)
      if (res.data?.success) {
        toast.success(res.data.message || 'Review posted successfully!')
        setIsModalOpen(false)
        fetchReviews(1)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Helpful Vote Toggle
  const handleVoteHelpful = async (reviewId, currentVote) => {
    if (!isAuthenticated) {
      toast.info('Please sign in to vote on reviews.')
      return
    }

    const voteType = currentVote === 'helpful' ? 'helpful' : 'helpful'
    try {
      const res = await reviewService.voteHelpful(productId, reviewId, voteType)
      if (res.data?.success) {
        setReviews((prev) =>
          prev.map((r) =>
            r._id === reviewId
              ? {
                  ...r,
                  helpful: res.data.helpful,
                  unhelpful: res.data.unhelpful,
                  userVote: res.data.userVote
                }
              : r
          )
        )
      }
    } catch (err) {
      toast.error('Failed to register vote.')
    }
  }

  // Delete Review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return

    try {
      const res = await reviewService.deleteReview(productId, reviewId)
      if (res.data?.success) {
        toast.success('Review deleted successfully')
        fetchReviews(1)
      }
    } catch (err) {
      toast.error('Failed to delete review')
    }
  }

  // Seller Reply
  const handleOpenReplyModal = (rev) => {
    setReplyModalReview(rev)
    setReplyText(rev.sellerResponse?.message || '')
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return

    try {
      setSubmittingReply(true)
      const res = await reviewService.replyToReview(productId, replyModalReview._id, {
        message: replyText,
        responderName: user?.role === 'admin' ? 'SKLP Official Team' : (user?.shopName || 'Verified Seller')
      })
      if (res.data?.success) {
        toast.success('Response posted successfully!')
        setReplyModalReview(null)
        fetchReviews(pagination.page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post reply')
    } finally {
      setSubmittingReply(false)
    }
  }

  const ratingDescriptions = {
    1: 'Poor - Not what I expected',
    2: 'Fair - Average quality',
    3: 'Good - Met basic expectations',
    4: 'Very Good - Impressive couture & styling',
    5: 'Exceptional - Outstanding luxury experience!'
  }

  return (
    <div className={`mt-16 pt-12 border-t ${isDarkMode ? 'border-white/10 text-white' : 'border-black/10 text-gray-900'}`}>
      {/* ================= 1. REVIEWS HEADER & ANALYTICS OVERVIEW ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-luxury-gold/20 text-luxury-gold text-xs font-bold uppercase tracking-widest rounded-full flex items-center gap-1.5">
              <FiAward /> Authentic Customer Feedback
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
            Ratings & Customer Reviews
          </h2>
          <p className="text-sm opacity-60 mt-1">
            Real customer insights, sizing reviews, and verified purchase experiences.
          </p>
        </div>

        <button
          onClick={handleOpenReviewModal}
          className="self-start lg:self-center px-6 py-3.5 bg-gradient-to-r from-luxury-gold via-yellow-500 to-luxury-gold text-luxury-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-luxury-gold/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <FiEdit3 size={16} /> Write a Review
        </button>
      </div>

      {/* ================= 2. METRICS DASHBOARD CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
        {/* Overall Rating Score Card */}
        <div className={`md:col-span-4 p-8 rounded-2xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-luxury-charcoal/60 border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          <div>
            <span className="text-xs uppercase tracking-widest text-luxury-gold font-bold block mb-2">
              Overall Score
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-serif font-extrabold text-luxury-gold">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '5.0'}
              </span>
              <span className="text-xl opacity-40 font-serif">/ 5.0</span>
            </div>

            {/* Stars */}
            <div className="flex gap-1.5 my-3 text-luxury-gold">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  size={20}
                  className={star <= Math.round(stats.averageRating || 5) ? 'fill-luxury-gold' : 'text-gray-500 opacity-40'}
                />
              ))}
            </div>

            <p className="text-xs opacity-70 font-medium">
              Based on <strong className="text-white">{stats.totalReviews}</strong> customer reviews
            </p>
          </div>

          <div className="pt-6 border-t border-white/10 mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-sm">
              {stats.recommendedPercentage}%
            </div>
            <div>
              <p className="text-xs font-bold text-green-400">Recommended by Buyers</p>
              <p className="text-[11px] opacity-60">Verified owners recommend this design</p>
            </div>
          </div>
        </div>

        {/* Rating Breakdown Progress Bars */}
        <div className={`md:col-span-5 p-8 rounded-2xl border flex flex-col justify-center ${
          isDarkMode ? 'bg-luxury-charcoal/60 border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          <span className="text-xs uppercase tracking-widest text-luxury-gold font-bold mb-4 block">
            Rating Distribution
          </span>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingBreakdown[star] || 0
              const percent = stats.ratingPercentages[star] || 0
              const isSelected = selectedRating === star

              return (
                <button
                  key={star}
                  onClick={() => setSelectedRating(isSelected ? null : star)}
                  className={`w-full flex items-center gap-3 text-xs group transition-all p-1.5 rounded-lg ${
                    isSelected ? 'bg-luxury-gold/20 font-bold' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="w-12 text-left flex items-center gap-1 font-semibold">
                    {star} <FiStar size={12} className="fill-luxury-gold text-luxury-gold" />
                  </span>
                  <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-luxury-gold to-yellow-400 rounded-full"
                    />
                  </div>
                  <span className="w-12 text-right opacity-60 font-mono text-[11px]">
                    {count} ({percent}%)
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fit Feedback Summary Card */}
        <div className={`md:col-span-3 p-8 rounded-2xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-luxury-charcoal/60 border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          <div>
            <span className="text-xs uppercase tracking-widest text-luxury-gold font-bold mb-2 block">
              Size & Fit Feedback
            </span>
            <p className="text-xs opacity-60 mb-6">Real feedback on sizing and tailoring accuracy</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>True to Size</span>
                  <span className="text-luxury-gold font-mono">{stats.fitSummary.trueToSize}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.fitSummary.trueToSize}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Runs Small</span>
                  <span className="opacity-60 font-mono">{stats.fitSummary.runsSmall}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${stats.fitSummary.runsSmall}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Runs Large</span>
                  <span className="opacity-60 font-mono">{stats.fitSummary.runsLarge}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.fitSummary.runsLarge}%` }} />
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] opacity-50 mt-4 text-center">
            {stats.fitSummary.totalResponses > 0
              ? `${stats.fitSummary.totalResponses} buyers reported their size experience`
              : 'Consistent standard size fitting'}
          </p>
        </div>
      </div>

      {/* ================= 3. CUSTOMER PHOTO GALLERY STRIP ================= */}
      {stats.allPhotos && stats.allPhotos.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-luxury-gold flex items-center gap-2">
              <FiCamera /> Customer Photos & Styling ({stats.allPhotos.length})
            </h3>
            <span className="text-xs opacity-50">Click any image to enlarge</span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {stats.allPhotos.map((photo, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                onClick={() => setLightboxImage(photo.url)}
                className="relative w-24 h-32 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 group cursor-zoom-in"
              >
                <img src={photo.url} alt="customer review photo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <FiImage size={20} className="text-white" />
                </div>
                <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-luxury-gold font-bold flex items-center gap-0.5">
                  <FiStar size={10} className="fill-luxury-gold" /> {photo.rating}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ================= 4. FILTERING & SORTING TOOLBAR ================= */}
      <div className={`p-4 rounded-2xl border mb-8 flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-luxury-charcoal/40 border-white/10' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-luxury-gold font-bold flex items-center gap-1.5 mr-2">
            <FiFilter /> Filter:
          </span>

          {/* All Filter */}
          <button
            onClick={() => setSelectedRating(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedRating === null
                ? 'bg-luxury-gold text-luxury-black font-bold'
                : 'bg-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            All Reviews ({stats.totalReviews})
          </button>

          {/* Star Filter Pills */}
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedRating(selectedRating === s ? null : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                selectedRating === s
                  ? 'bg-luxury-gold text-luxury-black font-bold'
                  : 'bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              {s} <FiStar size={11} className={selectedRating === s ? 'fill-luxury-black' : 'fill-luxury-gold text-luxury-gold'} />
            </button>
          ))}

          {/* Photos only toggle */}
          <button
            onClick={() => setOnlyWithPhotos(!onlyWithPhotos)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              onlyWithPhotos
                ? 'bg-luxury-gold text-luxury-black font-bold'
                : 'bg-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            <FiCamera size={12} /> With Photos
          </button>

          {/* Verified buyers only toggle */}
          <button
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              onlyVerified
                ? 'bg-luxury-gold text-luxury-black font-bold'
                : 'bg-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            <FiCheckCircle size={12} /> Verified Buyers
          </button>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`text-xs font-bold rounded-lg px-3 py-2 outline-none border transition-all ${
              isDarkMode
                ? 'bg-luxury-black border-white/10 text-white focus:border-luxury-gold'
                : 'bg-white border-gray-300 text-gray-900 focus:border-luxury-gold'
            }`}
          >
            <option value="most_helpful">Most Helpful</option>
            <option value="newest">Newest First</option>
            <option value="highest_rating">Highest Rating</option>
            <option value="lowest_rating">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* ================= 5. REVIEWS FEED LIST ================= */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm opacity-60">Loading customer reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isDarkMode ? 'bg-luxury-charcoal/30 border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          <FiMessageSquare size={40} className="mx-auto text-luxury-gold opacity-40 mb-4" />
          <h4 className="text-lg font-serif font-bold mb-2">No reviews found matching your filter</h4>
          <p className="text-xs opacity-60 max-w-md mx-auto mb-6">
            Be the first to share your experience with this couture item and help other fashion enthusiasts!
          </p>
          <button
            onClick={handleOpenReviewModal}
            className="px-6 py-3 bg-luxury-gold text-luxury-black font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-yellow-400 transition-colors"
          >
            Write the First Review
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((rev) => (
            <motion.div
              key={rev._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 md:p-8 rounded-2xl border transition-all ${
                isDarkMode ? 'bg-luxury-charcoal/50 border-white/10 hover:border-luxury-gold/30' : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              {/* Header: User Info, Rating, Date & Actions */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-luxury-gold to-yellow-200 text-luxury-black font-bold flex items-center justify-center uppercase overflow-hidden shadow">
                    {rev.reviewer?.avatar ? (
                      <img src={rev.reviewer.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{rev.reviewer?.name?.charAt(0) || 'U'}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm">{rev.reviewer?.name || 'Verified Customer'}</h4>
                      {rev.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <FiCheckCircle size={12} /> Verified Purchase
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-50">
                      {new Date(rev.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Owner / Admin Controls */}
                <div className="flex items-center gap-2">
                  {rev.isOwner && (
                    <button
                      onClick={() => handleDeleteReview(rev._id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Delete your review"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                  {['seller', 'admin'].includes(user?.role) && !rev.sellerResponse && (
                    <button
                      onClick={() => handleOpenReplyModal(rev)}
                      className="text-xs text-luxury-gold hover:underline font-semibold"
                    >
                      Reply as Store
                    </button>
                  )}
                </div>
              </div>

              {/* Star Rating & Fit Badge */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex text-luxury-gold">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <FiStar
                      key={st}
                      size={16}
                      className={st <= rev.rating ? 'fill-luxury-gold' : 'text-gray-500 opacity-40'}
                    />
                  ))}
                </div>

                {rev.fitFeedback && rev.fitFeedback !== 'not_specified' && (
                  <span className="text-[11px] font-semibold opacity-70 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                    Fit: <strong className="text-luxury-gold uppercase">{rev.fitFeedback.replace('_', ' ')}</strong>
                  </span>
                )}
              </div>

              {/* Review Headline & Content */}
              <h3 className="text-base font-bold mb-2 text-white">{rev.title}</h3>
              <p className="text-sm opacity-80 leading-relaxed whitespace-pre-line mb-4">
                {rev.comment}
              </p>

              {/* Customer Uploaded Photos */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                  {rev.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxImage(img.url)}
                      className="w-20 h-24 rounded-xl overflow-hidden border border-white/10 hover:border-luxury-gold transition-all flex-shrink-0 cursor-zoom-in"
                    >
                      <img src={img.url} alt="review attachment" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Helpful Vote Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-4 text-xs">
                  <span className="opacity-50">Was this review helpful?</span>
                  <button
                    onClick={() => handleVoteHelpful(rev._id, rev.userVote)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                      rev.userVote === 'helpful'
                        ? 'bg-luxury-gold/20 text-luxury-gold border-luxury-gold font-bold'
                        : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                    }`}
                  >
                    <FiThumbsUp size={13} className={rev.userVote === 'helpful' ? 'fill-luxury-gold' : ''} />
                    <span>Helpful ({rev.helpful || 0})</span>
                  </button>
                </div>
              </div>

              {/* Seller / Store Response Box */}
              {rev.sellerResponse && (
                <div className="mt-6 p-4 rounded-xl bg-luxury-gold/5 border border-luxury-gold/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiAward size={14} className="text-luxury-gold" />
                      <span className="text-xs font-bold text-luxury-gold uppercase tracking-wider">
                        {rev.sellerResponse.respondedByName || 'SKLP Official Store'} Response
                      </span>
                    </div>
                    <span className="text-[10px] opacity-40">
                      {new Date(rev.sellerResponse.respondedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed italic">
                    "{rev.sellerResponse.message}"
                  </p>
                </div>
              )}
            </motion.div>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchReviews(p)}
                  className={`w-9 h-9 rounded-lg font-bold text-xs transition-all ${
                    pagination.page === p
                      ? 'bg-luxury-gold text-luxury-black font-extrabold shadow-md'
                      : 'bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= 6. WRITE / EDIT REVIEW MODAL ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`w-full max-w-xl p-6 md:p-8 rounded-3xl border my-8 ${
                isDarkMode ? 'bg-luxury-charcoal border-luxury-gold/30 text-white' : 'bg-white text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <h3 className="text-xl font-serif font-bold">Share Your Experience</h3>
                  <p className="text-xs opacity-60">Reviewing: {productName}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:text-luxury-gold transition-colors">
                  <FiX size={22} />
                </button>
              </div>

              {eligibility?.canReview ? (
                eligibility?.isVerifiedPurchase && (
                  <div className="mb-6 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-2.5 text-xs text-green-400 font-bold">
                    <FiCheckCircle size={16} />
                    <span>Verified Delivered Purchase detected! Your review will feature the Verified Buyer badge.</span>
                  </div>
                )
              ) : (
                <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300 space-y-1">
                  <p className="font-bold flex items-center gap-2">
                    <FiAward size={15} /> Verified Buyer Verification Required
                  </p>
                  <p className="opacity-80">
                    {eligibility?.reason || 'To ensure authentic feedback, only customers with a successfully delivered order containing this specific item can submit a review.'}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-6">
                {/* 5-Star Interactive Rating */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-luxury-gold font-bold block mb-2">
                    Overall Rating *
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setFormRating(star)}
                          className="p-1 transition-transform hover:scale-125 focus:outline-none"
                        >
                          <FiStar
                            size={28}
                            className={`${
                              star <= (hoverRating || formRating)
                                ? 'fill-luxury-gold text-luxury-gold'
                                : 'text-gray-500 opacity-40'
                            } transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-luxury-gold">
                      {ratingDescriptions[hoverRating || formRating]}
                    </span>
                  </div>
                </div>

                {/* Review Title (Optional) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs uppercase tracking-widest text-luxury-gold font-bold">
                      Review Title (Optional)
                    </label>
                    <span className="text-[11px] opacity-40">{formTitle.length}/120</span>
                  </div>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Exceptional fabric quality & flawless fit!"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-3.5 bg-luxury-black/60 border border-white/10 rounded-xl outline-none focus:border-luxury-gold text-sm"
                  />
                </div>

                {/* Review Comment (4 - 2000 chars) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs uppercase tracking-widest text-luxury-gold font-bold">
                      Tell us about the product *
                    </label>
                    <span className={`text-[11px] font-mono ${formComment.length < 4 ? 'text-yellow-400' : 'opacity-50'}`}>
                      {formComment.length} / 2000 characters {formComment.length < 4 && '(min 4)'}
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    minLength={4}
                    maxLength={2000}
                    placeholder="Describe the fabric texture, comfort, tailoring, and occasion you wore this for..."
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    className="w-full p-3.5 bg-luxury-black/60 border border-white/10 rounded-xl outline-none focus:border-luxury-gold text-sm leading-relaxed"
                  />
                </div>

                {/* Fit Indicator */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-luxury-gold font-bold block mb-2">
                    How does it fit?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'runs_small', label: 'Runs Small' },
                      { id: 'true_to_size', label: 'True to Size' },
                      { id: 'runs_large', label: 'Runs Large' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormFit(opt.id)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                          formFit === opt.id
                            ? 'bg-luxury-gold text-luxury-black border-luxury-gold shadow-md'
                            : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Upload Dropzone */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-luxury-gold font-bold block mb-2">
                    Add Photos (Up to 5)
                  </label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {formImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-24 rounded-xl overflow-hidden border border-luxury-gold">
                        <img src={img.url} alt="upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/80 text-red-400 p-1 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}

                    {formImages.length < 5 && (
                      <label className="w-20 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-luxury-gold flex flex-col items-center justify-center cursor-pointer transition-colors text-center p-2 bg-white/5">
                        <FiUploadCloud size={20} className="text-luxury-gold mb-1" />
                        <span className="text-[10px] font-bold">Add Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          disabled={uploadingImages}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  {uploadingImages && <p className="text-xs text-luxury-gold animate-pulse">Uploading photos...</p>}
                </div>

                {/* Submit Action */}
                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/3 py-3.5 border border-white/20 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview || uploadingImages || (eligibility && !eligibility.canReview)}
                    className="w-2/3 py-3.5 bg-gradient-to-r from-luxury-gold to-yellow-400 text-luxury-black font-bold uppercase tracking-wider text-xs rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submittingReview
                      ? 'Submitting Review...'
                      : eligibility && !eligibility.canReview
                      ? 'Delivered Order Required'
                      : 'Publish Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= 7. PHOTO LIGHTBOX MODAL ================= */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-black/70 text-white p-2.5 rounded-full hover:bg-luxury-gold hover:text-black transition-colors z-10"
              >
                <FiX size={20} />
              </button>
              <img src={lightboxImage} alt="high-res customer photo" className="w-full h-full object-contain rounded-2xl max-h-[80vh]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= 8. SELLER REPLY MODAL ================= */}
      <AnimatePresence>
        {replyModalReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-lg p-6 rounded-3xl border bg-luxury-charcoal border-luxury-gold/30 text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <h3 className="text-lg font-serif font-bold">Store Official Response</h3>
                <button onClick={() => setReplyModalReview(null)}>
                  <FiX size={20} />
                </button>
              </div>

              <p className="text-xs opacity-60 mb-4">
                Responding to {replyModalReview.reviewer?.name}: "{replyModalReview.title}"
              </p>

              <form onSubmit={handleSubmitReply}>
                <textarea
                  required
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank the customer or provide support resolution..."
                  className="w-full p-3.5 bg-luxury-black/60 border border-white/10 rounded-xl outline-none focus:border-luxury-gold text-sm mb-4"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReplyModalReview(null)}
                    className="px-4 py-2 border border-white/20 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="px-6 py-2 bg-luxury-gold text-luxury-black font-bold rounded-lg text-xs hover:bg-yellow-400"
                  >
                    {submittingReply ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProductReviews
