import rateLimit from 'express-rate-limit';

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Use email as key for more effective rate limiting
    return req.body.email || req.ip;
  }
});

// OTP rate limiter
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 attempts per minute
  message: 'Too many OTP requests, please try again after 1 minute',
  keyGenerator: (req) => {
    return req.body.phone || req.ip;
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

// Create rate limiter
export const createResourceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 creates per minute
  message: 'You are creating resources too quickly, please try again later'
});

export default rateLimiter;
