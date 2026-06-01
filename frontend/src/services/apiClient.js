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
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    return Promise.reject(error.response?.data || error)
  }
)

export default apiClient
