import multer from 'multer';
import { ApiError } from './errorHandler.js';

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Memory storage — files stored as Buffer in req.files
const storage = multer.memoryStorage();

// File filter — validate MIME types
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Allowed types: JPG, PNG, WebP, GIF`
      ),
      false
    );
  }
};

// Base multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // max files per request
  },
});

/**
 * Upload multiple product images (up to 5)
 */
export const uploadProductImages = upload.array('images', 5);

/**
 * Upload a single avatar image
 */
export const uploadAvatar = upload.single('avatar');

/**
 * Upload a single banner image
 */
export const uploadBannerImage = upload.single('bannerImage');

/**
 * Generic multiple file upload (up to 10)
 */
export const uploadMultiple = upload.array('files', 10);

/**
 * Multer error handler middleware
 * Converts multer errors into ApiError format
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = 400;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 5 images per upload';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field: ${err.field}`;
        break;
      default:
        message = err.message;
    }

    return res.status(statusCode).json({
      success: false,
      message,
      error: err.code,
    });
  }

  next(err);
};

export default upload;
