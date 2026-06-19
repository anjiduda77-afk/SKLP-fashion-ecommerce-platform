import apiClient from './apiClient'
import { createUploadConfig } from './apiClient'

export const adminService = {
  // Dashboard
  getDashboardMetrics: () => apiClient.get('/admin/dashboard'),
  
  // Products
  getProducts: (params) => apiClient.get('/admin/products', { params }),
  createProduct: (productData) => apiClient.post('/admin/products', productData),
  updateProduct: (id, productData) => apiClient.put(`/admin/products/${id}`, productData),
  deleteProduct: (id) => apiClient.delete(`/admin/products/${id}`),
  
  // Product with image upload (multipart)
  createProductWithImages: (formData, onUploadProgress) => 
    apiClient.post('/admin/products', formData, createUploadConfig(onUploadProgress)),
  updateProductWithImages: (id, formData, onUploadProgress) => 
    apiClient.put(`/admin/products/${id}`, formData, createUploadConfig(onUploadProgress)),
  
  // Bulk operations
  bulkUpdateProducts: (productIds, action) => 
    apiClient.put('/admin/products/bulk/update', { productIds, action }),
  
  // Orders
  getOrders: (params) => apiClient.get('/admin/orders', { params }),
  updateOrderStatus: (id, statusData) => apiClient.put(`/admin/orders/${id}/status`, statusData),
  getOrderById: (id) => apiClient.get(`/admin/orders/${id}`),
  
  // Users
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  changeUserRole: (id, roleData) => apiClient.put(`/admin/users/${id}/role`, roleData),
  
  // Sellers
  getSellers: (params) => apiClient.get('/admin/sellers', { params }),
  verifySeller: (id, action, notes) => apiClient.put(`/admin/sellers/${id}/verify`, { action, notes }),
  
  // Coupons
  getCoupons: () => apiClient.get('/admin/coupons'),
  createCoupon: (couponData) => apiClient.post('/admin/coupons', couponData),
  updateCoupon: (id, couponData) => apiClient.put(`/admin/coupons/${id}`, couponData),
  deleteCoupon: (id) => apiClient.delete(`/admin/coupons/${id}`),
  
  // Returns
  getReturnRequests: () => apiClient.get('/admin/returns'),
  updateReturnStatus: (id, statusData) => apiClient.put(`/admin/returns/${id}/status`, statusData),
  
  // Banners
  getBanners: () => apiClient.get('/admin/banners'),
  createBanner: (bannerData) => apiClient.post('/admin/banners', bannerData),
  updateBanner: (id, bannerData) => apiClient.put(`/admin/banners/${id}`, bannerData),
  deleteBanner: (id) => apiClient.delete(`/admin/banners/${id}`),
  
  // Notifications
  getNotifications: () => apiClient.get('/admin/notifications'),
  createNotification: (notificationData) => apiClient.post('/admin/notifications', notificationData)
}

export default adminService
