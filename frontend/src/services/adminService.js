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
  updateOrderStatus: (id, status) => {
    const data = typeof status === 'string' ? { status } : status
    return apiClient.put(`/admin/orders/${id}/status`, data)
  },
  getOrderById: (id) => apiClient.get(`/admin/orders/${id}`),
  
  // Users
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  createUser: (userData) => apiClient.post('/admin/users', userData),
  changeUserRole: (id, roleData) => apiClient.put(`/admin/users/${id}/role`, roleData),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  
  // Sellers
  getSellers: (params) => apiClient.get('/admin/sellers', { params }),
  verifySeller: (id, action, notes) => apiClient.put(`/admin/sellers/${id}/verify`, { action, notes }),

  // Seller Applications (Become a Seller flow)
  getSellerApplications: (params) => apiClient.get('/admin/seller-applications', { params }),
  getSellerApplicationById: (id) => apiClient.get(`/admin/seller-applications/${id}`),
  reviewSellerApplication: (id, action, notes, reason) =>
    apiClient.put(`/admin/seller-applications/${id}/review`, { action, notes, reason }),
  downloadSellerAgreementPdf: (id) =>
    apiClient.get(`/admin/seller-applications/${id}/agreement-pdf`, { responseType: 'blob' }),
  getOrderPackingSlipPdf: (orderId, pkgIndex = 0) =>
    apiClient.get(`/admin/orders/${orderId}/packing-slip-pdf?pkgIndex=${pkgIndex}`, { responseType: 'blob' }),
  getOrderTaxInvoicePdf: (orderId) =>
    apiClient.get(`/admin/orders/${orderId}/invoice-pdf`, { responseType: 'blob' }),
  getOrderReceipt: (orderId) =>
    apiClient.get(`/admin/orders/${orderId}/receipt`),
  
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
  getNotifications: (params) => apiClient.get('/admin/notifications', { params }),
  getNotificationStats: () => apiClient.get('/admin/notifications/stats'),
  createNotification: (notificationData) => apiClient.post('/admin/notifications', notificationData),
  deleteNotification: (id) => apiClient.delete(`/admin/notifications/${id}`)
}

export default adminService
