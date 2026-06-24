import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
          localStorage.setItem('token', res.data.token)
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`
          return apiClient(originalRequest)
        } catch (err) {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

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
  getOrders: (params) => apiClient.get('/seller/orders', { params })
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
  googleLogin: (token) => apiClient.post('/auth/google', { token }),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken })
}

/**
 * User API Service
 */
export const userService = {
  getCurrentUser: () => apiClient.get('/users/me'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  getAddresses: () => apiClient.get('/users/addresses'),
  addAddress: (data) => apiClient.post('/users/addresses', data),
  updateAddress: (addressId, data) => apiClient.put(`/users/addresses/${addressId}`, data)
}

/**
 * Product API Service
 */
export const productService = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProductById: (id) => apiClient.get(`/products/${id}`)
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
  cancelOrder: (id) => apiClient.post(`/orders/${id}/cancel`)
}

export default apiClient
