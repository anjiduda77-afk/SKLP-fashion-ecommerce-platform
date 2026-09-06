import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

/**
 * ProtectedRoute Component
 * Protects routes based on authentication and user roles
 * Handles all 4 account types: Customer, Admin, Seller, Delivery Partner
 */
const ProtectedRoute = ({ allowedRoles = [], requiredRole, children }) => {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-luxury-gold"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />
  }

  // Normalize role requirements
  const rolesList = allowedRoles.length > 0 
    ? allowedRoles 
    : (requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : [])

  if (rolesList.length > 0) {
    const rawRole = (user?.role || '').toLowerCase().replace(/\s+/g, '').trim()
    const userRole = rawRole === 'deliverypartner' ? 'delivery' : rawRole

    const allowedRolesNorm = rolesList.map(r => {
      const norm = r.toLowerCase().replace(/\s+/g, '').trim()
      return norm === 'deliverypartner' ? 'delivery' : norm
    })

    if (!allowedRolesNorm.includes(userRole)) {
      const fallbackUrl = 
        userRole === 'admin' ? '/admin/dashboard' :
        userRole === 'seller' ? '/seller/dashboard' :
        userRole === 'delivery' ? '/delivery/dashboard' : '/'

      console.warn(`[AUTH] Access denied to ${location.pathname} for role ${user?.role}. Redirecting to ${fallbackUrl}`)
      return <Navigate to={fallbackUrl} replace />
    }
  }

  return children
}

export default ProtectedRoute
