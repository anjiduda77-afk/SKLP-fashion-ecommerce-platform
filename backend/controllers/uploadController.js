import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  isCloudinaryConfigured,
} from '../config/cloudinary.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Upload multiple product images
 * POST /api/upload/images
 * Expects multipart/form-data with field 'images' (up to 5 files)
 */
export const uploadProductImagesHandler = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No images provided. Upload at least one image.');
  }

  let results = [];

  if (isCloudinaryConfigured()) {
    // Upload each file buffer to Cloudinary
    results = await uploadMultipleImages(
      req.files.map((f) => f.buffer),
      {
        folder: 'products',
        width: 1200,
      }
    );
  } else {
    // Fallback: convert to base64 data URIs (for development without Cloudinary)
    console.warn('Cloudinary not configured — using base64 fallback for image upload');
    results = req.files.map((file, index) => ({
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      publicId: `local_${Date.now()}_${index}`,
      width: 0,
      height: 0,
      format: file.mimetype.split('/')[1],
      bytes: file.size,
    }));
  }

  res.status(200).json({
    success: true,
    message: `${results.length} image(s) uploaded successfully`,
    images: results.map((r) => ({
      url: r.url,
      publicId: r.publicId,
    })),
  });
};

/**
 * Upload single avatar image
 * POST /api/upload/avatar
 * Expects multipart/form-data with field 'avatar' (1 file)
 */
export const uploadAvatarHandler = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No avatar image provided');
  }

  let result;

  if (isCloudinaryConfigured()) {
    result = await uploadImage(req.file.buffer, {
      folder: 'avatars',
      width: 400,
      height: 400,
    });
  } else {
    console.warn('Cloudinary not configured — using base64 fallback for avatar');
    result = {
      url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      publicId: `local_avatar_${Date.now()}`,
    };
  }

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully',
    avatar: {
      url: result.url,
      publicId: result.publicId,
    },
  });
};

/**
 * Delete an uploaded image
 * DELETE /api/upload/:publicId
 * Deletes from Cloudinary using the publicId
 */
export const deleteImageHandler = async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, 'Image public ID is required');
  }

  // Decode the publicId (it may contain slashes encoded as %2F)
  const decodedId = decodeURIComponent(publicId);

  // Skip deletion for local/base64 images
  if (decodedId.startsWith('local_')) {
    return res.status(200).json({
      success: true,
      message: 'Local image reference removed',
    });
  }

  if (!isCloudinaryConfigured()) {
    return res.status(200).json({
      success: true,
      message: 'Cloudinary not configured — image reference removed locally',
    });
  }

  await deleteImage(decodedId);

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
  });
};
