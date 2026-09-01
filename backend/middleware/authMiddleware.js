import jwt from 'jsonwebtoken';
import { ApiError, asyncHandler } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sklp_fashion_key_anji7206';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '1b5bc5004ff832818fb5099e47e098765d8a5913048d028f8dabcb39ee649c8735d88a2d8084da7e1bcac6be2a735d1b6cffef78be668597b84fe9564b1f7976';

// Verify JWT token
export const verifyToken = asyncHandler((req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'No authentication token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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

// Verify seller role
export const sellerOnly = asyncHandler((req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.role !== 'seller') {
    throw new ApiError(403, 'Seller access required');
  }

  next();
});

// Verify seller or admin role
export const sellerOrAdmin = asyncHandler((req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    throw new ApiError(403, 'Seller or Admin access required');
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
      const decoded = jwt.verify(token, JWT_SECRET);
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
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
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
