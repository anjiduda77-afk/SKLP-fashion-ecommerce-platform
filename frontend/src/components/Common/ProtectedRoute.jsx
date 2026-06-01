import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

function ProtectedRoute({ children, requireAdmin = false, allowedRoles = [] }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-luxury-gold font-semibold">Verifying credentials...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Backwards compatibility with requireAdmin
  const roles = [...allowedRoles]
  if (requireAdmin && !roles.includes('admin')) {
    roles.push('admin')
  }

  // Check if role is allowed
  if (roles.length > 0 && !roles.includes(user?.role)) {
    // If not allowed, redirect to correct role-based dashboard/home
    if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />
    } else if (user?.role === 'seller') {
      return <Navigate to="/seller/dashboard" replace />
    } else if (user?.role === 'delivery' || user?.role === 'deliveryPartner') {
      return <Navigate to="/delivery/dashboard" replace />
    } else {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export default ProtectedRoute
