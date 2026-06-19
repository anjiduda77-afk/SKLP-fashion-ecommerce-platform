import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Check if Cloudinary is properly configured
 */
export const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Upload a single image to Cloudinary
 * @param {Buffer|string} fileInput - File buffer or base64 string
 * @param {object} options - Upload options
 * @param {string} options.folder - Cloudinary folder path (e.g., 'products', 'avatars')
 * @param {string} options.publicId - Custom public ID (optional)
 * @param {number} options.width - Resize width (optional)
 * @param {number} options.height - Resize height (optional)
 * @returns {Promise<{url: string, publicId: string, width: number, height: number, format: string, bytes: number}>}
 */
export const uploadImage = (fileInput, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `sklp/${options.folder || 'general'}`,
      resource_type: 'image',
      quality: 'auto:good',
      fetch_format: 'auto',
      flags: 'progressive',
      ...(options.publicId && { public_id: options.publicId }),
      ...(options.width && {
        transformation: [
          {
            width: options.width,
            height: options.height || options.width,
            crop: 'limit',
            quality: 'auto:good',
          },
        ],
      }),
    };

    // If fileInput is a Buffer, use upload_stream
    if (Buffer.isBuffer(fileInput)) {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new Error(`Image upload failed: ${error.message}`));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );
      stream.end(fileInput);
    } else if (typeof fileInput === 'string') {
      // base64 or URL string
      const dataUri = fileInput.startsWith('data:')
        ? fileInput
        : `data:image/jpeg;base64,${fileInput}`;

      cloudinary.uploader.upload(dataUri, uploadOptions, (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(`Image upload failed: ${error.message}`));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      });
    } else {
      reject(new Error('Invalid file input: expected Buffer or base64 string'));
    }
  });
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<Buffer|string>} files - Array of file buffers or base64 strings
 * @param {object} options - Upload options (folder, width, height)
 * @returns {Promise<Array<{url: string, publicId: string}>>}
 */
export const uploadMultipleImages = async (files, options = {}) => {
  if (!files || files.length === 0) return [];

  const results = await Promise.all(
    files.map((file) => uploadImage(file, options))
  );

  return results;
};

/**
 * Delete a single image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<{result: string}>}
 */
export const deleteImage = async (publicId) => {
  if (!publicId) throw new Error('Public ID is required to delete image');

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {string[]} publicIds - Array of public IDs to delete
 * @returns {Promise<object>}
 */
export const deleteMultipleImages = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) return {};

  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw new Error(`Bulk image deletion failed: ${error.message}`);
  }
};

export default cloudinary;
