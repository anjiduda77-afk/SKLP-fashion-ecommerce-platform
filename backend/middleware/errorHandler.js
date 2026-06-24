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
  let error = err;

  // Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
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
    error = new ApiError(401, 'Invalid token. Please log in again.');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Your token has expired. Please log in again.');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const errors = error.errors || [];

  // Log error
  console.error('Error:', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errors.length > 0 && { errors }),
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
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
