import jwt from 'jsonwebtoken';
import { ApiError, asyncHandler } from './errorHandler.js';

// Verify JWT token
export const verifyToken = asyncHandler((req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'No authentication token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    throw new ApiError(401, 'Invalid token');
  }
});

// Verify admin role
export const adminOnly = asyncHandler((req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }

  next();
});

// Verify user ownership or admin status
export const ownerOrAdmin = asyncHandler((req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const userId = req.params.userId || req.params.id;
  const isOwner = req.user.id === userId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Unauthorized access');
  }

  next();
});

// Optional authentication - doesn't fail if token is missing
export const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token is invalid but it's optional, so we don't fail
      console.warn('Invalid token provided:', error.message);
    }
  }

  next();
};

// Refresh token verification
export const verifyRefreshToken = asyncHandler((req, res, next) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token provided');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

// Role-based access control
export const roleBasedAccess = (roles) => {
  return asyncHandler((req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  });
};

export default verifyToken;
