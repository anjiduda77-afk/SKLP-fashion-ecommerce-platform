// Custom error class
export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }
}

// Async handler to wrap route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Sanitize error messages to eliminate technical leaks (database details, cloud providers, file paths)
export const sanitizeClientErrorMessage = (rawMessage, statusCode) => {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'An unexpected error occurred. Please try again.';
  }

  // Never leak connection strings, auth tokens, secrets, or server filesystem paths
  if (
    /mongodb(\+srv)?:\/\/|password|secret|bearer|token=|key=|projectId|appId/i.test(rawMessage) ||
    /([a-zA-Z]:\\|\/(?:home|var|etc|tmp|app|usr)\/)/.test(rawMessage) ||
    /at\s+[\w\d_.]+\s+\(/i.test(rawMessage)
  ) {
    return 'A security exception was handled safely. Request could not be processed.';
  }

  // Sanitize internal infrastructure and provider names
  let clean = rawMessage
    .replace(/Firebase(?:\s*Admin|\s*Cloud\s*Messaging)?/gi, 'Authentication Service')
    .replace(/\bFCM\b/gi, 'Push')
    .replace(/Mongo(?:DB)?(?:ServerError)?:?\s*/gi, 'Data ')
    .replace(/Mongoose:?\s*/gi, 'Data ')
    .replace(/Vercel(?:\.app)?:?\s*/gi, 'Web Server ')
    .replace(/Render(?:\.com)?:?\s*/gi, 'Application Server ')
    .replace(/onrender\.com/gi, 'server')
    .replace(/E11000 duplicate key error collection.*index: (\w+).*/gi, '$1 already exists')
    .replace(/Cast to ObjectId failed.*/gi, 'Invalid record identifier format')
    .trim();

  if (statusCode >= 500) {
    return 'We encountered an unexpected error processing your request. Please try again later.';
  }

  return clean;
};

// Global error handler middleware
export const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    error = new ApiError(400, 'Invalid request parameter identifier');
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid session. Please log in again.');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const statusCode = error.statusCode || 500;
  const rawMsg = error.message || 'Internal Server Error';
  const cleanMessage = sanitizeClientErrorMessage(rawMsg, statusCode);
  const errors = error.errors || [];

  // Log error internally for administrators (never sent to client)
  console.error('[SERVER ERROR]', {
    statusCode,
    message: rawMsg,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Client response: 100% clean, sanitized, zero data or infrastructure leaks
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: cleanMessage,
    ...(errors.length > 0 && { errors }),
    timestamp: new Date().toISOString()
  });
};


// MongoDB validation error handler
export const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message
  }));
  return new ApiError(400, 'Validation Error', errors);
};

// Mongoose duplicate key error handler
export const handleDuplicateKeyError = (error) => {
  const field = (error.keyPattern && Object.keys(error.keyPattern)[0]) ||
                (error.keyValue && Object.keys(error.keyValue)[0]) ||
                'Field';
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  return new ApiError(409, message);
};

// JWT error handler
export const handleJwtError = () => {
  return new ApiError(401, 'Invalid or expired token');
};
