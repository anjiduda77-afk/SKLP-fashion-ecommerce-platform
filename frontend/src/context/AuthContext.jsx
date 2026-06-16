import { createContext, useContext, useState, useEffect } from 'react'
import { userService } from '@services/apiServices'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  const logout = () => {
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
  }

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
            setUser(JSON.parse(savedUser))
            setToken(savedToken)
            setIsAuthenticated(true)
          } else {
            logout()
          }
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData }
    setUser(newUser)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        token,
        loading,
        login,
        logout,
        updateUser,
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
