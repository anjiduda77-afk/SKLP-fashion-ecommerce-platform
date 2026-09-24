import rateLimit from 'express-rate-limit';

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks, preflights, and root
    return (
      req.method === 'OPTIONS' ||
      req.path === '/' ||
      req.path === '/health' ||
      req.path === '/api/health'
    );
  }
});

// Strict rate limiter for auth endpoints (Generous limit for smooth customer login & testing)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after a few minutes.'
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.body?.email || req.body?.phone || req.ip;
  }
});

// OTP rate limiter - Up to 100 requests allowed per 5 minutes
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: 100, // Limit to 100 requests per 5 minutes
  message: {
    success: false,
    message: 'Too many OTP attempts. Please try again after 2 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body?.phone || req.ip;
  }
});

// Payment rate limiter
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many payment requests, please try again after 1 minute'
});

// Admin operations rate limiter
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for admins
  message: 'Rate limit exceeded for admin operations'
});

// KYC verification rate limiter (strictly protects Aadhaar, PAN, Bank, and OTP operations)
export const kycRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 verification attempts per 10 minutes
  message: {
    success: false,
    message: 'Too many KYC verification attempts. Please wait a few minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.body?.panNumber || req.body?.aadhaarNumber || req.ip;
  }
});

export default rateLimiter;
