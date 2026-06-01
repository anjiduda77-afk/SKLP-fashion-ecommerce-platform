import apiClient from './apiClient'

export const adminService = {
  getDashboardMetrics: () => apiClient.get('/admin/dashboard'),
  
  getProducts: (params) => apiClient.get('/admin/products', { params }),
  createProduct: (productData) => apiClient.post('/admin/products', productData),
  updateProduct: (id, productData) => apiClient.put(`/admin/products/${id}`, productData),
  deleteProduct: (id) => apiClient.delete(`/admin/products/${id}`),
  
  getOrders: (params) => apiClient.get('/admin/orders', { params }),
  updateOrderStatus: (id, status) => apiClient.put(`/admin/orders/${id}/status`, { status }),
  getOrderById: (id) => apiClient.get(`/admin/orders/${id}`),
  
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  changeUserRole: (id, roleData) => apiClient.put(`/admin/users/${id}/role`, roleData),
  
  getCoupons: () => apiClient.get('/admin/coupons'),
  createCoupon: (couponData) => apiClient.post('/admin/coupons', couponData),
  updateCoupon: (id, couponData) => apiClient.put(`/admin/coupons/${id}`, couponData),
  deleteCoupon: (id) => apiClient.delete(`/admin/coupons/${id}`),
  
  getReturnRequests: () => apiClient.get('/admin/returns'),
  updateReturnStatus: (id, statusData) => apiClient.put(`/admin/returns/${id}/status`, statusData),
  
  getBanners: () => apiClient.get('/admin/banners'),
  createBanner: (bannerData) => apiClient.post('/admin/banners', bannerData),
  updateBanner: (id, bannerData) => apiClient.put(`/admin/banners/${id}`, bannerData),
  deleteBanner: (id) => apiClient.delete(`/admin/banners/${id}`),
  
  getNotifications: () => apiClient.get('/admin/notifications'),
  createNotification: (notificationData) => apiClient.post('/admin/notifications', notificationData)
}

export default adminService
