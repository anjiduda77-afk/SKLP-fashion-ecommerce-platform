import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { userService, authService } from '@services/apiServices'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (err) {
      // Silent fail on logout API call
    }
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }, [])

  const logoutAllDevices = useCallback(async () => {
    try {
      await authService.logoutAll()
    } catch (err) {
      console.warn('Logout all failed:', err.message)
    }
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }, [])

  const login = useCallback((userData, authToken, refreshToken) => {
    setUser(userData)
    setToken(authToken)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
  }, [])

  // Attempt to silently refresh the token
  const refreshAuth = useCallback(async () => {
    const savedRefreshToken = localStorage.getItem('refreshToken')
    if (!savedRefreshToken) return false

    try {
      const res = await authService.refreshToken(savedRefreshToken)
      if (res.data?.success) {
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('refreshToken', res.data.refreshToken)
        setToken(res.data.token)
        return true
      }
    } catch (err) {
      console.warn('Silent refresh failed:', err.message)
    }
    return false
  }, [])

  // Initialize auth state from localStorage and verify with API
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('user')
      const savedToken = localStorage.getItem('token')

      if (savedToken) {
        try {
          // Temporarily set credentials in state so interception logic resolves it
          setToken(savedToken)
          // Fetch latest user profile from backend
          const res = await userService.getCurrentUser()
          if (res.data?.success && res.data?.user) {
            setUser(res.data.user)
            setIsAuthenticated(true)
            localStorage.setItem('user', JSON.stringify(res.data.user))
          } else {
            logout()
          }
        } catch (err) {
          console.warn('Failed to verify token on boot, falling back to cached user:', err.message)
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser))
              setToken(savedToken)
              setIsAuthenticated(true)
            } catch (e) {
              logout()
            }
          } else {
            logout()
          }
        }
      }
      setLoading(false)
    }
    initAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      const newUser = { ...prev, ...updatedData }
      localStorage.setItem('user', JSON.stringify(newUser))
      return newUser
    })
  }, [])

  // Role helpers
  const isAdmin = useCallback(() => user?.role === 'admin', [user])
  const isSeller = useCallback(() => user?.role === 'seller', [user])
  const isCustomer = useCallback(() => user?.role === 'customer', [user])
  const isDelivery = useCallback(() => user?.role === 'delivery' || user?.role === 'deliveryPartner', [user])
  const hasRole = useCallback((roles) => {
    if (!user?.role) return false
    if (Array.isArray(roles)) return roles.includes(user.role)
    return user.role === roles
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        token,
        loading,
        login,
        logout,
        logoutAllDevices,
        updateUser,
        refreshAuth,
        // Role helpers
        isAdmin,
        isSeller,
        isCustomer,
        isDelivery,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
