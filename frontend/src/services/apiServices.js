import apiClient from './apiClient'

export const authService = {
  // Email Login
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),

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

  // Forgot Password
  forgotPassword: (email) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),

  // Refresh Token
  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh-token', { refreshToken }),

  // Logout
  logout: () =>
    apiClient.post('/auth/logout'),
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

export default {
  authService,
  userService,
  productService,
  cartService,
  orderService,
  wishlistService,
}
