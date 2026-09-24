import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { userService, authService, cartService } from '@services/apiServices'

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
    localStorage.removeItem('cart')
    localStorage.removeItem('wishlist')
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
    localStorage.removeItem('cart')
    localStorage.removeItem('wishlist')
  }, [])

  // ── Enhanced Login: merge guest cart & wishlist automatically ──
  const login = useCallback(async (userData, authToken, refreshToken) => {
    setUser(userData)
    setToken(authToken)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }

    // Merge guest cart items into server cart
    try {
      const guestCartRaw = localStorage.getItem('cart')
      if (guestCartRaw) {
        const guestItems = JSON.parse(guestCartRaw)
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          // Transform to backend format
          const mergePayload = guestItems.map(item => ({
            productId: item.id || item.productId,
            quantity: item.quantity || 1,
            variant: item.variant || {}
          })).filter(item => item.productId)

          if (mergePayload.length > 0) {
            await cartService.mergeCart(mergePayload)
          }
        }
      }
    } catch (err) {
      console.warn('Guest cart merge failed (non-critical):', err.message)
    }

    // Clear guest cart after merge attempt
    localStorage.removeItem('cart')
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

  // Initialize auth state from localStorage (Instant Stale-While-Revalidate pattern)
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const savedUser = localStorage.getItem('user')
      const savedToken = localStorage.getItem('token')

      // 1. Instant optimistic hydration: unblock UI immediately if cached user exists
      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser)
          if (isMounted) {
            setUser(parsed)
            setToken(savedToken)
            setIsAuthenticated(true)
            setLoading(false) // Immediately render UI with cached data!
          }
        } catch (_) {
          // If JSON parse failed, clean up
          localStorage.removeItem('user')
        }
      } else if (savedToken) {
        if (isMounted) {
          setToken(savedToken)
        }
      }

      // 2. Background revalidation: fetch authoritative profile from server
      if (savedToken) {
        try {
          const res = await userService.getCurrentUser()
          if (res.data?.success && res.data?.user && isMounted) {
            setUser(res.data.user)
            setIsAuthenticated(true)
            localStorage.setItem('user', JSON.stringify(res.data.user))
          }
        } catch (err) {
          // If server explicitly returned 401 Unauthorized, token is expired/invalid
          if (err.response?.status === 401) {
            const refreshed = await refreshAuth()
            if (!refreshed && isMounted) {
              logout()
            }
          } else {
            console.warn('[AUTH] Background revalidation offline/failed, using cached profile:', err.message)
          }
        }
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    initAuth()
    return () => { isMounted = false }
  }, [logout, refreshAuth])

  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      const newUser = { ...prev, ...updatedData }
      localStorage.setItem('user', JSON.stringify(newUser))
      return newUser
    })
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await userService.getCurrentUser()
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return res.data.user
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err.message)
    }
    return null
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
        isEmailVerified: Boolean(user?.isEmailVerified),
        isPhoneVerified: Boolean(user?.isPhoneVerified),
        customUserId: user?.customUserId || null,
        login,
        logout,
        logoutAllDevices,
        updateUser,
        refreshUser,
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
