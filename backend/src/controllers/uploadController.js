/**
 * Upload Controller
 * Handles HTTP requests for image upload operations
 */

const uploadService = require('../services/uploadService');
const { BadRequestError, ForbiddenError } = require('../utils/errors');

/**
 * Upload Image
 * POST /api/v1/upload/image
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const uploadImage = async (req, res, next) => {
  try {
    // Check if file exists
    if (!req.file) {
      throw new BadRequestError('No file uploaded. Please provide an image file.');
    }

    // Validate file size (Multer should handle this, but double-check)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'File size exceeds 5MB limit.'
      });
    }

    // Upload options from request body (optional)
    const options = {
      quality: parseInt(req.body.quality) || 85,
      maxWidth: parseInt(req.body.maxWidth) || 1920,
      generateThumbnail: req.body.generateThumbnail === 'true'
    };

    // Only set format if explicitly provided (otherwise preserve original)
    if (req.body.format) {
      options.format = req.body.format;
    }

    // Handle upload
    const uploadResult = await uploadService.handleImageUpload(
      req.file,
      req.user,
      options
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: uploadResult.imageUrl,
        filename: uploadResult.filename,
        size: uploadResult.size,
        originalSize: uploadResult.originalSize,
        compressionRatio: uploadResult.compressionRatio,
        format: uploadResult.format,
        dimensions: uploadResult.dimensions,
        storageType: uploadResult.storageType,
        uploadedAt: uploadResult.uploadedAt
      }
    });
  } catch (error) {
    // Handle Multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size exceeds 5MB limit.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new BadRequestError('Too many files. Only one file is allowed.'));
    }

    next(error);
  }
};

/**
 * Delete Image
 * DELETE /api/v1/upload/image
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    // Validate image URL
    if (!imageUrl) {
      throw new BadRequestError('Image URL is required.');
    }

    // Check ownership (organizers can only delete their own images, admins can delete any)
    if (req.user.role !== 'ADMIN') {
      const isOwner = await uploadService.validateImageOwnership(imageUrl, req.user._id);
      if (!isOwner) {
        throw new ForbiddenError('You do not have permission to delete this image.');
      }
    }

    // Delete image
    const deleteResult = await uploadService.deleteImage(imageUrl, req.user);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: deleteResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Multiple Images
 * DELETE /api/v1/upload/images
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteMultipleImages = async (req, res, next) => {
  try {
    const { imageUrls } = req.body;

    // Validate input
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new BadRequestError('Image URLs array is required.');
    }

    // Check ownership for non-admins
    if (req.user.role !== 'ADMIN') {
      for (const imageUrl of imageUrls) {
        const isOwner = await uploadService.validateImageOwnership(imageUrl, req.user._id);
        if (!isOwner) {
          throw new ForbiddenError('You do not have permission to delete one or more images.');
        }
      }
    }

    // Delete images
    const results = await uploadService.deleteMultipleImages(imageUrls, req.user);

    res.status(200).json({
      success: true,
      message: 'Images deletion completed',
      data: {
        successCount: results.success.length,
        failedCount: results.failed.length,
        success: results.success,
        failed: results.failed
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Storage Info
 * GET /api/v1/upload/info
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getStorageInfo = async (req, res, next) => {
  try {
    const storageInfo = uploadService.getStorageInfo();

    res.status(200).json({
      success: true,
      data: storageInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Image by Filename (alternative endpoint)
 * DELETE /api/v1/upload/image/:filename
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteImageByFilename = async (req, res, next) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      throw new BadRequestError('Filename is required.');
    }

    // Construct full URL based on storage type
    const storageType = uploadService.getStorageType();
    let imageUrl;

    if (storageType === 's3') {
      // Construct S3 URL
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION || 'us-east-1';
      imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filename}`;
    } else {
      // Construct local URL
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      imageUrl = `${baseUrl}/uploads/images/${filename}`;
    }

    // Check ownership (organizers can only delete their own images, admins can delete any)
    if (req.user.role !== 'ADMIN') {
      const isOwner = await uploadService.validateImageOwnership(imageUrl, req.user._id);
      if (!isOwner) {
        throw new ForbiddenError('You do not have permission to delete this image.');
      }
    }

    // Delete image
    const deleteResult = await uploadService.deleteImage(imageUrl, req.user);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: deleteResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User's Uploaded Images
 * GET /api/v1/upload/my-images
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getMyImages = async (req, res, next) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 50,
      isUsed: req.query.isUsed !== undefined ? req.query.isUsed === 'true' : undefined
    };

    const images = await uploadService.getUserImages(req.user._id, options);

    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  deleteMultipleImages,
  deleteImageByFilename,
  getStorageInfo,
  getMyImages
};


