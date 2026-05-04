/**
 * Image Processing Utility
 * Handles image resizing, compression, optimization using Sharp
 */

const sharp = require('sharp');

// Image processing configuration
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 85;
const THUMBNAIL_WIDTH = 300;

/**
 * Process and optimize image
 * Resizes, compresses, and optimizes the image for web usage
 * 
 * @param {Buffer} imageBuffer - Raw image buffer
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processed image data
 */
const processImage = async (imageBuffer, options = {}) => {
  try {
    const {
      maxWidth = MAX_WIDTH,
      maxHeight = MAX_HEIGHT,
      quality = QUALITY,
      format = 'webp', // Default to WebP for better compression
      generateThumbnail = false
    } = options;

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    // Process main image
    let imageProcessor = sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside', // Maintain aspect ratio
        withoutEnlargement: true // Don't upscale smaller images
      })
      .rotate(); // Auto-rotate based on EXIF orientation

    // Convert to specified format with optimization
    if (format === 'webp') {
      imageProcessor = imageProcessor.webp({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
      imageProcessor = imageProcessor.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      imageProcessor = imageProcessor.png({ quality, compressionLevel: 9 });
    }

    // Strip EXIF metadata for privacy and size reduction
    const processedBuffer = await imageProcessor.toBuffer();

    // Get processed image metadata
    const processedMetadata = await sharp(processedBuffer).metadata();

    const result = {
      buffer: processedBuffer,
      format: processedMetadata.format,
      width: processedMetadata.width,
      height: processedMetadata.height,
      size: processedBuffer.length,
      originalSize: imageBuffer.length,
      compressionRatio: ((1 - processedBuffer.length / imageBuffer.length) * 100).toFixed(2) + '%'
    };

    // Generate thumbnail if requested
    if (generateThumbnail) {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(THUMBNAIL_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();

      result.thumbnail = {
        buffer: thumbnailBuffer,
        size: thumbnailBuffer.length
      };
    }

    return result;
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Validate image buffer
 * Checks if buffer is a valid image
 * 
 * @param {Buffer} imageBuffer - Image buffer to validate
 * @returns {Promise<Boolean>} True if valid image
 */
const validateImage = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return !!(metadata.width && metadata.height);
  } catch (error) {
    return false;
  }
};

/**
 * Get image dimensions
 * 
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} Image dimensions {width, height}
 */
const getImageDimensions = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  } catch (error) {
    throw new Error(`Failed to get image dimensions: ${error.message}`);
  }
};

/**
 * Resize image to specific dimensions
 * 
 * @param {Buffer} imageBuffer - Image buffer
 * @param {Number} width - Target width
 * @param {Number} height - Target height
 * @returns {Promise<Buffer>} Resized image buffer
 */
const resizeImage = async (imageBuffer, width, height) => {
  try {
    return await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
  } catch (error) {
    throw new Error(`Image resize failed: ${error.message}`);
  }
};

/**
 * Convert image to specific format
 * 
 * @param {Buffer} imageBuffer - Image buffer
 * @param {String} format - Target format (webp, jpeg, png)
 * @param {Number} quality - Quality (1-100)
 * @returns {Promise<Buffer>} Converted image buffer
 */
const convertFormat = async (imageBuffer, format, quality = QUALITY) => {
  try {
    let processor = sharp(imageBuffer);

    if (format === 'webp') {
      processor = processor.webp({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
      processor = processor.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      processor = processor.png({ quality, compressionLevel: 9 });
    }

    return await processor.toBuffer();
  } catch (error) {
    throw new Error(`Format conversion failed: ${error.message}`);
  }
};

module.exports = {
  processImage,
  validateImage,
  getImageDimensions,
  resizeImage,
  convertFormat,
  MAX_WIDTH,
  MAX_HEIGHT,
  QUALITY,
  THUMBNAIL_WIDTH
};




