/**
 * Upload Service
 * Orchestrates image upload workflow including processing and storage
 */

const { processImage, validateImage } = require('../utils/imageProcessor');
const { uploadToS3, deleteFromS3, extractS3KeyFromUrl, isS3Configured } = require('../utils/s3Upload');
const { saveLocally, deleteLocally, extractFilenameFromUrl, fileExists } = require('../utils/localStorage');

/**
 * Determine storage type based on environment configuration
 * @returns {String} Storage type ('s3' or 'local')
 */
const getStorageType = () => {
  const storageType = process.env.STORAGE_TYPE || 'local';
  
  // If S3 is selected but not configured, fall back to local
  if (storageType === 's3' && !isS3Configured()) {
    console.warn('S3 storage selected but not configured. Falling back to local storage.');
    return 'local';
  }
  
  return storageType;
};

/**
 * Handle image upload
 * Processes and uploads image to configured storage
 * 
 * @param {Object} file - Multer file object
 * @param {Object} user - User object (for authorization)
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const handleImageUpload = async (file, user, options = {}) => {
  try {
    // Validate file exists
    if (!file) {
      throw new Error('No file provided');
    }

    // Get file buffer (from memory storage or read from disk)
    const fileBuffer = file.buffer || require('fs').readFileSync(file.path);

    // Validate image
    const isValid = await validateImage(fileBuffer);
    if (!isValid) {
      throw new Error('Invalid image file');
    }

    // Get original image format if not specified
    const sharp = require('sharp');
    const metadata = await sharp(fileBuffer).metadata();
    const originalFormat = metadata.format;

    // Process image
    const {
      format = originalFormat || 'webp', // Preserve original format by default
      quality = 85,
      maxWidth = 1920,
      generateThumbnail = false
    } = options;

    const processedImage = await processImage(fileBuffer, {
      format,
      quality,
      maxWidth,
      generateThumbnail
    });

    // Determine content type
    const contentTypeMap = {
      webp: 'image/webp',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png'
    };
    const contentType = contentTypeMap[processedImage.format] || 'image/webp';

    // Upload to storage
    const storageType = getStorageType();
    let uploadResult;

    if (storageType === 's3') {
      uploadResult = await uploadToS3(processedImage.buffer, {
        contentType,
        format: processedImage.format
      });
    } else {
      uploadResult = await saveLocally(processedImage.buffer, {
        format: processedImage.format,
        originalFilename: file.originalname
      });
    }

    // Cleanup temporary file if using disk storage
    if (file.path) {
      try {
        require('fs').unlinkSync(file.path);
      } catch (err) {
        console.error('Failed to cleanup temp file:', err);
      }
    }

    // Save upload record to database
    const UploadedImage = require('../models/UploadedImage');
    try {
      await UploadedImage.create({
        imageUrl: uploadResult.url,
        filename: uploadResult.filename || uploadResult.key,
        originalName: file.originalname,
        uploadedBy: user._id,
        storageType,
        size: processedImage.size,
        format: processedImage.format,
        dimensions: {
          width: processedImage.width,
          height: processedImage.height
        },
        metadata: {
          originalSize: processedImage.originalSize,
          compressionRatio: processedImage.compressionRatio,
          quality: options.quality
        }
      });
    } catch (dbError) {
      console.error('Failed to save upload record:', dbError);
      // Don't fail the upload if DB save fails, but log it
    }

    // Return upload information
    return {
      success: true,
      imageUrl: uploadResult.url,
      filename: uploadResult.filename || uploadResult.key,
      size: processedImage.size,
      originalSize: processedImage.originalSize,
      compressionRatio: processedImage.compressionRatio,
      format: processedImage.format,
      dimensions: {
        width: processedImage.width,
        height: processedImage.height
      },
      storageType,
      uploadedBy: user._id,
      uploadedAt: new Date()
    };
  } catch (error) {
    // Cleanup temporary file on error
    if (file && file.path) {
      try {
        require('fs').unlinkSync(file.path);
      } catch (err) {
        console.error('Failed to cleanup temp file after error:', err);
      }
    }

    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Delete image from storage
 * 
 * @param {String} imageUrl - Full image URL
 * @param {Object} user - User object (for authorization)
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (imageUrl, user) => {
  try {
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    const storageType = getStorageType();
    let deleteResult;

    if (storageType === 's3' || imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('.cloudfront.')) {
      // S3 deletion
      const s3Key = extractS3KeyFromUrl(imageUrl);
      deleteResult = await deleteFromS3(s3Key);
    } else {
      // Local deletion
      const filename = extractFilenameFromUrl(imageUrl);
      deleteResult = await deleteLocally(filename);
    }

    // Remove record from database
    const UploadedImage = require('../models/UploadedImage');
    try {
      await UploadedImage.deleteOne({ imageUrl });
    } catch (dbError) {
      console.error('Failed to delete upload record:', dbError);
      // Don't fail the deletion if DB delete fails
    }

    return {
      success: true,
      message: 'Image deleted successfully',
      deletedBy: user._id,
      deletedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

/**
 * Delete multiple images
 * 
 * @param {Array} imageUrls - Array of image URLs
 * @param {Object} user - User object
 * @returns {Promise<Object>} Deletion results
 */
const deleteMultipleImages = async (imageUrls, user) => {
  const results = {
    success: [],
    failed: []
  };

  for (const imageUrl of imageUrls) {
    try {
      await deleteImage(imageUrl, user);
      results.success.push(imageUrl);
    } catch (error) {
      results.failed.push({
        url: imageUrl,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Validate image URL belongs to user
 * Checks both uploaded images and events
 * 
 * @param {String} imageUrl - Image URL
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} True if user owns the image
 */
const validateImageOwnership = async (imageUrl, userId) => {
  try {
    const UploadedImage = require('../models/UploadedImage');
    const Event = require('../models/Event').Event;
    
    // First, check if image exists in UploadedImage collection
    const uploadedImage = await UploadedImage.findOne({ imageUrl });
    
    if (uploadedImage) {
      // Check if user is the uploader
      return uploadedImage.uploadedBy.toString() === userId.toString();
    }
    
    // Fallback: Check if image is used in an event (backward compatibility)
    const event = await Event.findOne({ imageUrl });
    
    if (event) {
      // Check if user is the organizer
      return event.organizer.toString() === userId.toString();
    }
    
    // Image not found anywhere
    return false;
  } catch (error) {
    console.error('Error validating image ownership:', error);
    return false;
  }
};

/**
 * Get storage information
 * 
 * @returns {Object} Storage configuration info
 */
const getStorageInfo = () => {
  const storageType = getStorageType();
  
  return {
    type: storageType,
    configured: storageType === 's3' ? isS3Configured() : true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    processingOptions: {
      maxWidth: 1920,
      quality: 85,
      format: 'webp'
    }
  };
};

/**
 * Get user's uploaded images
 * 
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of uploaded images
 */
const getUserImages = async (userId, options = {}) => {
  try {
    const UploadedImage = require('../models/UploadedImage');
    
    return await UploadedImage.findByUploader(userId, options);
  } catch (error) {
    throw new Error(`Failed to get user images: ${error.message}`);
  }
};

/**
 * Mark image as used in an event
 * 
 * @param {String} imageUrl - Image URL
 * @param {String} eventId - Event ID
 */
const markImageAsUsed = async (imageUrl, eventId) => {
  try {
    const UploadedImage = require('../models/UploadedImage');
    
    const image = await UploadedImage.findOne({ imageUrl });
    if (image) {
      await image.markAsUsed(eventId);
    }
  } catch (error) {
    console.error('Failed to mark image as used:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Mark image as unused (when event is deleted)
 * 
 * @param {String} imageUrl - Image URL
 */
const markImageAsUnused = async (imageUrl) => {
  try {
    const UploadedImage = require('../models/UploadedImage');
    
    const image = await UploadedImage.findOne({ imageUrl });
    if (image) {
      await image.markAsUnused();
    }
  } catch (error) {
    console.error('Failed to mark image as unused:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Clean up orphaned images
 * Deletes images uploaded but not used in events after X days
 * 
 * @param {Number} olderThanDays - Delete images older than this many days
 * @returns {Promise<Object>} Cleanup results
 */
const cleanupOrphanedImages = async (olderThanDays = 7) => {
  try {
    const UploadedImage = require('../models/UploadedImage');
    
    const orphanedImages = await UploadedImage.findOrphaned(olderThanDays);
    
    const results = {
      deleted: [],
      failed: []
    };
    
    for (const image of orphanedImages) {
      try {
        await deleteImage(image.imageUrl, { _id: image.uploadedBy });
        results.deleted.push(image.imageUrl);
      } catch (error) {
        results.failed.push({
          url: image.imageUrl,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Cleanup failed: ${error.message}`);
  }
};

module.exports = {
  handleImageUpload,
  deleteImage,
  deleteMultipleImages,
  validateImageOwnership,
  getStorageInfo,
  getStorageType,
  getUserImages,
  markImageAsUsed,
  markImageAsUnused,
  cleanupOrphanedImages
};


