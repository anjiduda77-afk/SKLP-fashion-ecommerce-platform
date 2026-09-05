import jwt from 'jsonwebtoken';
import { ApiError, asyncHandler } from './errorHandler.js';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js';
import { normalizeIndianPhone } from '../controllers/authController.js';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sklp_fashion_key_anji7206';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '1b5bc5004ff832818fb5099e47e098765d8a5913048d028f8dabcb39ee649c8735d88a2d8084da7e1bcac6be2a735d1b6cffef78be668597b84fe9564b1f7976';

// Verify JWT or Firebase ID Token
export const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.header('Authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new ApiError(401, 'No authentication token provided');
  }

  // 1. Try application JWT token first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    // Only try Firebase / Google verification if token looks like a real JWT, Google OAuth token, or test token
    const segments = token.split('.');
    const isLikelyFirebaseOrGoogleToken = 
      (segments.length === 3 && token.length >= 80) || 
      token.startsWith('ya29.') || 
      token.includes('test_firebase_token_');

    if (!isLikelyFirebaseOrGoogleToken) {
      throw new ApiError(401, 'Invalid authentication token');
    }
  }

  // 2. Try Firebase ID Token verification (only for valid JWT-format tokens)
  try {
    const decodedFirebase = await verifyFirebaseIdToken(token);
    if (decodedFirebase && (decodedFirebase.uid || decodedFirebase.email || decodedFirebase.phone_number)) {
      const cleanPhone = decodedFirebase.phone_number ? normalizeIndianPhone(decodedFirebase.phone_number) : null;
      const orConditions = [
        ...(decodedFirebase.uid ? [{ firebaseUid: decodedFirebase.uid }] : []),
        ...(decodedFirebase.email ? [{ email: decodedFirebase.email.toLowerCase().trim() }] : []),
        ...(cleanPhone ? [{ phone: cleanPhone }] : [])
      ];

      if (orConditions.length > 0) {
        const user = await User.findOne({ $or: orConditions });

        if (user) {
          if (decodedFirebase.uid && !user.firebaseUid) {
            user.firebaseUid = decodedFirebase.uid;
            await user.save().catch(() => {});
          }

          req.user = {
            id: user._id.toString(),
            uid: user.firebaseUid || decodedFirebase.uid,
            email: user.email,
            role: user.role,
            provider: user.authProvider || 'google'
          };
          req.firebaseUser = decodedFirebase;
          return next();
        }
      }
    }
  } catch (fbErr) {
    // Firebase verification also failed
  }

  throw new ApiError(401, 'Invalid authentication token');
});

// Dedicated Firebase ID Token verification middleware
export const verifyFirebaseToken = asyncHandler(async (req, res, next) => {
  const token = req.header('Authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new ApiError(401, 'No authentication token provided');
  }

  try {
    const decodedFirebase = await verifyFirebaseIdToken(token);
    const cleanPhone = decodedFirebase.phone_number ? normalizeIndianPhone(decodedFirebase.phone_number) : null;
    const orConditions = [
      ...(decodedFirebase.uid ? [{ firebaseUid: decodedFirebase.uid }] : []),
      ...(decodedFirebase.email ? [{ email: decodedFirebase.email.toLowerCase().trim() }] : []),
      ...(cleanPhone ? [{ phone: cleanPhone }] : [])
    ];

    if (orConditions.length === 0) {
      throw new ApiError(401, 'No searchable identity found in Firebase token');
    }

    const user = await User.findOne({ $or: orConditions });

    if (!user) {
      throw new ApiError(401, 'User not found for this Firebase token');
    }

    if (decodedFirebase.uid && !user.firebaseUid) {
      user.firebaseUid = decodedFirebase.uid;
      await user.save().catch(() => {});
    }

    req.user = {
      ...user.toJSON(),
      id: user._id.toString(),
      uid: user.firebaseUid || decodedFirebase.uid,
      email: user.email,
      role: user.role,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    };
    req.firebaseUser = decodedFirebase;
    next();
  } catch (error) {
    throw new ApiError(401, error.message || 'Invalid or expired Firebase authentication token');
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

// Verify delivery partner role
export const deliveryOnly = asyncHandler((req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.role !== 'delivery' && req.user.role !== 'deliveryPartner' && req.user.role !== 'deliverypartner') {
    throw new ApiError(403, 'Delivery Partner access required');
  }

  next();
});

// Verify customer role
export const customerOnly = asyncHandler((req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.role !== 'customer') {
    throw new ApiError(403, 'Customer access required');
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
  const token = req.header('Authorization')?.replace(/^Bearer\s+/i, '');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token is invalid but it's optional, so we don't fail
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
