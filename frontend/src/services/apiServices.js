import apiClient, { createUploadConfig } from './apiClient'

/**
 * Delivery Partner API Service
 */
export const deliveryService = {
  // Dashboard
  getDashboard: () => apiClient.get('/delivery/dashboard'),

  // Orders
  getAssignedOrders: (params) => apiClient.get('/delivery/orders', { params }),
  updateOrderStatus: (orderId, data) =>
    apiClient.put(`/delivery/orders/${orderId}/status`, data),
  updateDeliveryLocation: (orderId, data) =>
    apiClient.post(`/delivery/orders/${orderId}/location`, data),

  // Earnings
  getEarnings: (period = 'month') =>
    apiClient.get('/delivery/earnings', { params: { period } }),

  // Analytics
  getAnalytics: () => apiClient.get('/delivery/analytics')
}

/**
 * Admin API Service
 */
export const adminService = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getOrders: (params) => apiClient.get('/admin/orders', { params }),
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  getProducts: (params) => apiClient.get('/admin/products', { params })
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
  updateProfile: (data) => apiClient.put('/seller/profile', data)
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
  login: (email, password, rememberMe) =>
    apiClient.post('/auth/login', { email, password, rememberMe }),
  register: (data) => apiClient.post('/auth/register', data),
  sendOTP: (phone) => apiClient.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => apiClient.post('/auth/verify-otp', { phone, otp }),
  googleLogin: (token) => apiClient.post('/auth/google-login', { token }),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }),
  logoutAll: () => apiClient.post('/auth/logout-all'),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, newPassword })
}

/**
 * User API Service
 */
export const userService = {
  getCurrentUser: () => apiClient.get('/users/me'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  changePassword: (oldPassword, newPassword) => apiClient.put('/users/change-password', { oldPassword, newPassword }),
  getAddresses: () => apiClient.get('/users/addresses'),
  addAddress: (data) => apiClient.post('/users/addresses', data),
  updateAddress: (addressId, data) => apiClient.put(`/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => apiClient.delete(`/users/addresses/${addressId}`)
}

/**
 * Product API Service
 */
export const productService = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProductById: (id) => apiClient.get(`/products/${id}`),
  getProduct: (id) => apiClient.get(`/products/${id}`)
}

/**
 * Cart API Service
 */
export const cartService = {
  getCart: () => apiClient.get('/cart'),
  addToCart: (productId, quantity, variant) =>
    apiClient.post('/cart/items', { productId, quantity, variant }),
  updateCartItem: (itemId, quantity) =>
    apiClient.put(`/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
  removeFromCart: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
  clearCart: () => apiClient.delete('/cart'),
  applyCoupon: (code) => apiClient.post('/cart/coupon', { code })
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
 * Wishlist API Service
 */
export const wishlistService = {
  getWishlist: () => apiClient.get('/wishlist'),
  addToWishlist: (productId) => apiClient.post('/wishlist', { productId }),
  removeFromWishlist: (productId) => apiClient.delete(`/wishlist/${productId}`),
  clearWishlist: () => apiClient.delete('/wishlist')
}

export default apiClient

