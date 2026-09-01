import apiClient, { createUploadConfig } from './apiClient'

/**
 * Delivery Partner API Service
 */
export const deliveryService = {
  getDashboard: () => apiClient.get('/delivery/dashboard'),
  getAssignedOrders: (params) => apiClient.get('/delivery/orders', { params }),
  updateOrderStatus: (orderId, data) =>
    apiClient.put(`/delivery/orders/${orderId}/status`, data),
  updateDeliveryLocation: (orderId, data) =>
    apiClient.post(`/delivery/orders/${orderId}/location`, data),
  getEarnings: (period = 'month') =>
    apiClient.get('/delivery/earnings', { params: { period } }),
  getAnalytics: () => apiClient.get('/delivery/analytics')
}

/**
 * Admin API Service
 */
export const adminService = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getOrders: (params) => apiClient.get('/admin/orders', { params }),
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  getProducts: (params) => apiClient.get('/admin/products', { params }),
  getSellers: (params) => apiClient.get('/admin/sellers', { params }),
  verifySeller: (id, action, notes) => apiClient.put(`/admin/sellers/${id}/verify`, { action, notes }),
  // Seller Applications & Anti-cheating
  getSellerApplications: (params) => apiClient.get('/admin/seller-applications', { params }),
  reviewSellerApplication: (id, data) => apiClient.put(`/admin/seller-applications/${id}/review`, data),
  // Marketplace Revenue & Settlements
  getMarketplaceRevenue: () => apiClient.get('/admin/marketplace-revenue'),
  markSettlementPaid: (id, data) => apiClient.put(`/admin/settlements/${id}/pay`, data),
  // Review Moderation
  getReviews: (params) => apiClient.get('/admin/reviews', { params }),
  updateReviewStatus: (id, data) => apiClient.put(`/admin/reviews/${id}/status`, data)
}

/**
 * Seller API Service
 */
export const sellerService = {
  getDashboard: () => apiClient.get('/seller/dashboard'),
  getProducts: (params) => apiClient.get('/seller/products', { params }),
  createProduct: (data) => apiClient.post('/seller/products', data),
  updateProduct: (id, data) => apiClient.put(`/seller/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/seller/products/${id}`),
  getOrders: (params) => apiClient.get('/seller/orders', { params }),
  dispatchOrder: (id, data) => apiClient.put(`/seller/orders/${id}/dispatch`, data),
  getProfile: () => apiClient.get('/seller/profile'),
  updateProfile: (data) => apiClient.put('/seller/profile', data),
  // Multi-seller product offers
  getOffers: () => apiClient.get('/seller/offers'),
  createOffer: (data) => apiClient.post('/seller/offers', data),
  // Settlement ledger
  getSettlements: (params) => apiClient.get('/seller/settlements', { params }),
  // Subscriptions & Plans
  getSubscription: () => apiClient.get('/seller/subscription'),
  selectSubscriptionPlan: (data) => apiClient.post('/seller/subscription/select-plan', data)
}

/**
 * Seller Application Service (Become a Seller)
 */
export const sellerApplicationService = {
  checkShopName: (shopName) => apiClient.get('/seller/check-shop-name', { params: { shopName } }),
  submitApplication: (data) => apiClient.post('/seller/apply', data),
  getStatus: () => apiClient.get('/seller/application/status')
}

/**
 * Public Shop Service
 */
export const shopService = {
  getShop: (slug) => apiClient.get(`/shops/${slug}`),
  getShopProducts: (slug, params) => apiClient.get(`/shops/${slug}/products`, { params })
}

/**
 * Upload API Service
 */
export const uploadService = {
  uploadImages: (files, onProgress) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('images', f))
    return apiClient.post('/upload/images', formData, createUploadConfig(onProgress))
  },
  deleteImage: (publicId) => apiClient.delete(`/upload/images/${publicId}`)
}

/**
 * Auth API Service
 */
export const authService = {
  googleAuth: (idToken) => apiClient.post('/auth/google', { idToken }, { headers: { Authorization: `Bearer ${idToken}` } }),
  firebaseLogin: (idToken) => apiClient.post('/auth/google', { idToken }, { headers: { Authorization: `Bearer ${idToken}` } }),
  googleLogin: (token) => apiClient.post('/auth/google', { token }, { headers: { Authorization: `Bearer ${token}` } }),
  login: (email, password, rememberMe) =>
    apiClient.post('/auth/login', { email, password, rememberMe }),
  register: (data) => apiClient.post('/auth/register', data),
  sendOTP: (phone) => apiClient.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => apiClient.post('/auth/verify-otp', { phone, otp }),
  resendOTP: (phone) => apiClient.post('/auth/resend-otp', { phone }),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }),
  logoutAll: () => apiClient.post('/auth/logout-all'),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, newPassword }),
  verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),
  resendVerification: (email) => apiClient.post('/auth/resend-verification', { email }),
  getSessions: () => apiClient.get('/auth/sessions'),
  getMe: () => apiClient.get('/auth/me'),
  sendLinkPhoneOTP: (phone) => apiClient.post('/auth/link-phone/send-otp', { phone }),
  verifyLinkPhone: (phone, otp) => apiClient.post('/auth/link-phone/verify', { phone, otp }),
  linkEmail: (email) => apiClient.post('/auth/link-email', { email })
}

/**
 * User API Service
 */
export const userService = {
  getCurrentUser: () => apiClient.get('/users/me'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  updatePreferences: (data) => apiClient.put('/users/preferences', data),
  toggleTwoFactor: (enabled) => apiClient.put('/users/2fa', { enabled }),
  changePassword: (oldPassword, newPassword) => apiClient.put('/users/change-password', { oldPassword, newPassword }),
  getAddresses: () => apiClient.get('/users/addresses'),
  addAddress: (data) => apiClient.post('/users/addresses', data),
  updateAddress: (addressId, data) => apiClient.put(`/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => apiClient.delete(`/users/addresses/${addressId}`),
  addSavedUpi: (data) => apiClient.post('/users/upi', data),
  deleteSavedUpi: (upiId) => apiClient.delete(`/users/upi/${upiId}`),
  exportUserData: () => apiClient.get('/users/export-data'),
  deactivateAccount: (data) => apiClient.post('/users/deactivate', data)
}

/**
 * Product API Service
 */
export const productService = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProductById: (id) => apiClient.get(`/products/${id}`),
  getProduct: (id) => apiClient.get(`/products/${id}`),
  getProductOffers: (productId) => apiClient.get(`/products/${productId}/offers`)
}

/**
 * Cart API Service
 */
export const cartService = {
  getCart: () => apiClient.get('/cart'),
  addToCart: (productId, quantity, variant, offerId) =>
    apiClient.post('/cart/items', { productId, quantity, variant, offerId }),
  updateCartItem: (itemId, quantity) =>
    apiClient.put(`/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
  removeFromCart: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
  clearCart: () => apiClient.delete('/cart'),
  applyCoupon: (code) => apiClient.post('/cart/coupon', { code }),
  mergeCart: (items) => apiClient.post('/cart/merge', { items })
}

/**
 * Order API Service
 */
export const orderService = {
  createOrder: (data) => apiClient.post('/orders', data),
  getOrders: () => apiClient.get('/orders'),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  trackOrder: (id) => apiClient.get(`/orders/${id}/track`),
  verifyRazorpayPayment: (data) => apiClient.post('/orders/verify-payment', data),
  cancelOrder: (id, reason) => apiClient.put(`/orders/${id}/cancel`, { reason }),
  requestReturn: (id, items, reason) => apiClient.post(`/orders/${id}/return`, { items, reason })
}

/**
 * Delivery Fee Service
 */
export const deliveryFeeService = {
  calculate: (address) => apiClient.post('/delivery-fee/calculate', address),
  getConfig: () => apiClient.get('/delivery-fee/config'),
  updateConfig: (data) => apiClient.put('/delivery-fee/config', data)
}

/**
 * Wishlist API Service
 */
export const wishlistService = {
  getWishlist: () => apiClient.get('/wishlist'),
  addToWishlist: (productId) => apiClient.post('/wishlist', { productId }),
  removeFromWishlist: (productId) => apiClient.delete(`/wishlist/${productId}`),
  clearWishlist: () => apiClient.delete('/wishlist')
}

/**
 * Product Reviews API Service
 */
export const reviewService = {
  getReviews: (productId, params) => apiClient.get(`/products/${productId}/reviews`, { params }),
  checkEligibility: (productId) => apiClient.get(`/products/${productId}/reviews/eligibility`),
  createOrUpdateReview: (productId, data) => apiClient.post(`/products/${productId}/reviews`, data),
  deleteReview: (productId, reviewId) => apiClient.delete(`/products/${productId}/reviews/${reviewId}`),
  voteHelpful: (productId, reviewId, voteType = 'helpful') =>
    apiClient.post(`/products/${productId}/reviews/${reviewId}/helpful`, { voteType }),
  replyToReview: (productId, reviewId, data) =>
    apiClient.post(`/products/${productId}/reviews/${reviewId}/reply`, data)
}

/**
 * Public Campaign & Marketing Service
 */
export const campaignService = {
  getActiveCampaigns: (params) => apiClient.get('/campaigns/active', { params }),
  trackEvent: (campaignId, data) => apiClient.post(`/campaigns/${campaignId}/track`, data)
}

/**
 * Admin Marketing & Campaign Management Service
 */
export const adminMarketingService = {
  getCampaigns: (params) => apiClient.get('/admin/campaigns', { params }),
  getCampaignById: (id) => apiClient.get(`/admin/campaigns/${id}`),
  createCampaign: (data) => apiClient.post('/admin/campaigns', data),
  updateCampaign: (id, data) => apiClient.put(`/admin/campaigns/${id}`, data),
  deleteCampaign: (id) => apiClient.delete(`/admin/campaigns/${id}`),
  cloneCampaign: (id) => apiClient.post(`/admin/campaigns/${id}/clone`),
  toggleStatus: (id, status) => apiClient.put(`/admin/campaigns/${id}/status`, { status }),
  emergencyStopAll: () => apiClient.post('/admin/campaigns/emergency-stop-all'),
  getCalendar: () => apiClient.get('/admin/campaigns/calendar'),
  getFunnelAnalytics: () => apiClient.get('/admin/campaigns/funnel'),
  getAuditLogs: (params) => apiClient.get('/admin/campaigns/audit-logs', { params }),
  getAssets: (params) => apiClient.get('/admin/campaigns/assets', { params }),
  createAsset: (data) => apiClient.post('/admin/campaigns/assets', data),
  deleteAsset: (id) => apiClient.delete(`/admin/campaigns/assets/${id}`)
}

export default apiClient
