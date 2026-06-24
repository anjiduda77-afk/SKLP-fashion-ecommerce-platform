import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

/**
 * ProtectedRoute Component
 * Protects routes based on authentication and user roles
 * Handles all 4 account types: Customer, Admin, Seller, Delivery Partner
 */
const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-luxury-gold"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Check if user has required role
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user?.role || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim()

    const allowedRolesNorm = allowedRoles.map(r =>
      r
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim()
    )

    if (!allowedRolesNorm.includes(userRole)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export default ProtectedRoute
