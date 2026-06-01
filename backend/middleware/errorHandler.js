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

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || [];

  // Log error
  console.error('Error:', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errors.length > 0 && { errors }),
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
  const field = Object.keys(error.keyPattern)[0];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  return new ApiError(409, message);
};

// JWT error handler
export const handleJwtError = () => {
  return new ApiError(401, 'Invalid or expired token');
};
