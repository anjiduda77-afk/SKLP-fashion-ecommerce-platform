import apiClient from './apiClient'
import { createUploadConfig } from './apiClient'
import adminService from './adminService'

export const authService = {
  // Email Login
  login: (email, password, rememberMe) =>
    apiClient.post('/auth/login', { email, password, rememberMe }),

  // Email Register
  register: (userData) =>
    apiClient.post('/auth/register', userData),

  // Google OAuth
  googleLogin: (googleToken) =>
    apiClient.post('/auth/google-login', { token: googleToken }),

  // OTP Login
  sendOTP: (phone) =>
    apiClient.post('/auth/send-otp', { phone }),

  verifyOTP: (phone, otp) =>
    apiClient.post('/auth/verify-otp', { phone, otp }),

  // Email Verification
  verifyEmail: (token) =>
    apiClient.post('/auth/verify-email', { token }),

  resendVerification: (email) =>
    apiClient.post('/auth/resend-verification', { email }),

  // Forgot Password
  forgotPassword: (email) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),

  // Refresh Token
  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh-token', { refreshToken }),

  // Logout
  logout: (refreshToken) =>
    apiClient.post('/auth/logout', { refreshToken }),

  // Logout all devices
  logoutAll: () =>
    apiClient.post('/auth/logout-all'),

  // Active sessions
  getSessions: () =>
    apiClient.get('/auth/sessions'),
}

export const userService = {
  // Get current user
  getCurrentUser: () =>
    apiClient.get('/users/me'),

  // Update profile
  updateProfile: (userData) =>
    apiClient.put('/users/profile', userData),

  // Change password
  changePassword: (oldPassword, newPassword) =>
    apiClient.put('/users/change-password', { oldPassword, newPassword }),

  // Get addresses
  getAddresses: () =>
    apiClient.get('/users/addresses'),

  // Add address
  addAddress: (addressData) =>
    apiClient.post('/users/addresses', addressData),

  // Update address
  updateAddress: (addressId, addressData) =>
    apiClient.put(`/users/addresses/${addressId}`, addressData),

  // Delete address
  deleteAddress: (addressId) =>
    apiClient.delete(`/users/addresses/${addressId}`),

  // Get wishlist
  getWishlist: () =>
    apiClient.get('/users/wishlist'),

  // Get recently viewed products
  getRecentlyViewed: () =>
    apiClient.get('/users/recently-viewed'),
}

export const productService = {
  // Get all products
  getProducts: (params) =>
    apiClient.get('/products', { params }),

  // Get product by ID
  getProduct: (productId) =>
    apiClient.get(`/products/${productId}`),

  // Search products
  searchProducts: (query, filters) =>
    apiClient.get('/products/search', { params: { q: query, ...filters } }),

  // Get featured products
  getFeaturedProducts: () =>
    apiClient.get('/products/featured'),

  // Get trending products
  getTrendingProducts: () =>
    apiClient.get('/products/trending'),

  // Get related products
  getRelatedProducts: (productId) =>
    apiClient.get(`/products/${productId}/related`),

  // Get product reviews
  getReviews: (productId, params) =>
    apiClient.get(`/products/${productId}/reviews`, { params }),

  // Add review
  addReview: (productId, reviewData) =>
    apiClient.post(`/products/${productId}/reviews`, reviewData),

  // Get product recommendations
  getRecommendations: () =>
    apiClient.get('/products/ai/recommendations'),

  // Get similar products
  getSimilarProducts: (productId) =>
    apiClient.get(`/products/${productId}/similar`),
}

export const cartService = {
  // Get cart
  getCart: () =>
    apiClient.get('/cart'),

  // Add to cart
  addToCart: (productId, quantity, variant) =>
    apiClient.post('/cart/items', { productId, quantity, variant }),

  // Update cart item
  updateCartItem: (cartItemId, quantity) =>
    apiClient.put(`/cart/items/${cartItemId}`, { quantity }),

  // Remove from cart
  removeFromCart: (cartItemId) =>
    apiClient.delete(`/cart/items/${cartItemId}`),

  // Clear cart
  clearCart: () =>
    apiClient.delete('/cart'),

  // Apply coupon
  applyCoupon: (couponCode) =>
    apiClient.post('/cart/coupon', { code: couponCode }),

  // Remove coupon
  removeCoupon: () =>
    apiClient.delete('/cart/coupon'),
}

export const orderService = {
  // Create order
  createOrder: (orderData) =>
    apiClient.post('/orders', orderData),

  // Get orders
  getOrders: (params) =>
    apiClient.get('/orders', { params }),

  // Get order by ID
  getOrder: (orderId) =>
    apiClient.get(`/orders/${orderId}`),

  // Cancel order
  cancelOrder: (orderId, reason) =>
    apiClient.put(`/orders/${orderId}/cancel`, { reason }),

  // Track order
  trackOrder: (orderId) =>
    apiClient.get(`/orders/${orderId}/track`),

  // Request return
  requestReturn: (orderId, items, reason) =>
    apiClient.post(`/orders/${orderId}/return`, { items, reason }),

  // Get return status
  getReturnStatus: (orderId) =>
    apiClient.get(`/orders/${orderId}/return-status`),
}

export const wishlistService = {
  // Get wishlist
  getWishlist: () =>
    apiClient.get('/wishlist'),

  // Add to wishlist
  addToWishlist: (productId) =>
    apiClient.post('/wishlist', { productId }),

  // Remove from wishlist
  removeFromWishlist: (productId) =>
    apiClient.delete(`/wishlist/${productId}`),

  // Clear wishlist
  clearWishlist: () =>
    apiClient.delete('/wishlist'),
}

export const uploadService = {
  // Upload product images
  uploadImages: (files, onUploadProgress) => {
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))
    return apiClient.post('/upload/images', formData, createUploadConfig(onUploadProgress))
  },

  // Upload avatar
  uploadAvatar: (file, onUploadProgress) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return apiClient.post('/upload/avatar', formData, createUploadConfig(onUploadProgress))
  },

  // Delete image
  deleteImage: (publicId) =>
    apiClient.delete(`/upload/${encodeURIComponent(publicId)}`),
}

export const sellerService = {
  // Dashboard
  getDashboard: () =>
    apiClient.get('/seller/dashboard'),

  // Products
  getProducts: (params) =>
    apiClient.get('/seller/products', { params }),

  createProduct: (productData) =>
    apiClient.post('/seller/products', productData),

  updateProduct: (id, productData) =>
    apiClient.put(`/seller/products/${id}`, productData),

  deleteProduct: (id) =>
    apiClient.delete(`/seller/products/${id}`),

  deleteProductImage: (productId, imageIndex) =>
    apiClient.delete(`/seller/products/${productId}/images/${imageIndex}`),

  // Orders
  getOrders: (params) =>
    apiClient.get('/seller/orders', { params }),

  dispatchOrder: (id, data) =>
    apiClient.put(`/seller/orders/${id}/dispatch`, data),

  // Profile
  getProfile: () =>
    apiClient.get('/seller/profile'),

  updateProfile: (profileData) =>
    apiClient.put('/seller/profile', profileData),
}

export default {
  authService,
  userService,
  productService,
  cartService,
  orderService,
  wishlistService,
  uploadService,
  sellerService,
  adminService,
}
