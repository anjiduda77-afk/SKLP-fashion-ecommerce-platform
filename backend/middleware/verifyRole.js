import { ApiError } from './errorHandler.js'

/**
 * Middleware to verify user role
 * Normalizes role comparison to handle camelCase, spacing, and case variations
 * @param {string|string[]} allowedRoles - Role(s) allowed to access the route
 */
export const verifyRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required')
      }

      // Normalize user role
      const userRole = (req.user.role || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim()

      // Normalize allowed roles
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
      const normalizedRoles = rolesArray.map(role =>
        role
          .toLowerCase()
          .replace(/\s+/g, '')
          .trim()
      )

      // Check if user role is in allowed roles
      if (normalizedRoles.length > 0 && !normalizedRoles.includes(userRole)) {
        throw new ApiError(
          403,
          `Unauthorized. User role "${req.user.role}" does not have access. Required: ${rolesArray.join(', ')}`
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

export default verifyRole
