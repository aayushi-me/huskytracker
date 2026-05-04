/**
 * Upload Routes
 * Routes for image upload and management
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, authorize } = require('../middleware/auth');
const { getUploadMiddleware } = require('../config/multer');

// Get appropriate upload middleware based on storage type
const upload = getUploadMiddleware();

/**
 * POST /api/v1/upload/image
 * Upload a single image
 * Requires authentication (ORGANIZER or ADMIN)
 */
router.post(
  '/image',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  upload.single('image'), // 'image' is the field name
  uploadController.uploadImage
);

/**
 * DELETE /api/v1/upload/image
 * Delete image by URL
 * Requires authentication (ORGANIZER or ADMIN)
 */
router.delete(
  '/image',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  uploadController.deleteImage
);

/**
 * DELETE /api/v1/upload/image/:filename
 * Delete image by filename
 * Requires authentication (ORGANIZER or ADMIN)
 */
router.delete(
  '/image/:filename',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  uploadController.deleteImageByFilename
);

/**
 * DELETE /api/v1/upload/images
 * Delete multiple images
 * Requires authentication (ORGANIZER or ADMIN)
 */
router.delete(
  '/images',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  uploadController.deleteMultipleImages
);

/**
 * GET /api/v1/upload/info
 * Get storage configuration info
 * Public endpoint (no authentication required)
 */
router.get(
  '/info',
  uploadController.getStorageInfo
);

/**
 * GET /api/v1/upload/my-images
 * Get current user's uploaded images
 * Requires authentication (ORGANIZER or ADMIN)
 */
router.get(
  '/my-images',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  uploadController.getMyImages
);

/**
 * Error handler for multer errors
 * This catches file upload errors and formats them properly
 */
router.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size exceeds 5MB limit',
        error: err.message
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Only one image file is allowed',
        error: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }

  // Handle file type errors
  if (err.message && err.message.includes('Invalid file')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      allowedTypes: ['jpg', 'jpeg', 'png', 'webp']
    });
  }

  // Pass to global error handler
  next(err);
});

module.exports = router;


