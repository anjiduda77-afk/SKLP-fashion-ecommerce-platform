import axios from 'axios'

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Robust URL formatting: ensure it ends with /api and has no trailing slashes
if (API_URL.endsWith('/')) {
  API_URL = API_URL.slice(0, -1)
}
if (!API_URL.endsWith('/api')) {
  API_URL += '/api'
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token refresh state management
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

// Request interceptor - add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Response interceptor - handle errors with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh-token or login requests
      if (
        originalRequest.url?.includes('/auth/refresh-token') ||
        originalRequest.url?.includes('/auth/login')
      ) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        isRefreshing = false
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        })

        if (response.data.success) {
          const { token: newToken, refreshToken: newRefreshToken } = response.data
          localStorage.setItem('token', newToken)
          localStorage.setItem('refreshToken', newRefreshToken)

          apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          processQueue(null, newToken)
          isRefreshing = false

          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Create a multipart/form-data request config for file uploads
 */
export const createUploadConfig = (onUploadProgress) => ({
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  timeout: 120000, // 2 minutes for uploads
  ...(onUploadProgress && { onUploadProgress }),
})

export default apiClient
