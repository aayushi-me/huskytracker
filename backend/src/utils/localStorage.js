/**
 * Local Storage Utility
 * Handles file storage on local filesystem for development
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Upload directory path
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');

/**
 * Ensure directories exist
 * Creates upload directories if they don't exist
 */
const ensureDirectories = async () => {
  try {
    // Create main uploads directory
    if (!fsSync.existsSync(UPLOAD_DIR)) {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Create temp directory
    if (!fsSync.existsSync(TEMP_DIR)) {
      await fs.mkdir(TEMP_DIR, { recursive: true });
    }

    // Create images directory
    if (!fsSync.existsSync(IMAGES_DIR)) {
      await fs.mkdir(IMAGES_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating directories:', error);
    throw new Error(`Failed to create upload directories: ${error.message}`);
  }
};

/**
 * Generate unique filename
 * 
 * @param {String} originalFilename - Original file name
 * @param {String} format - File format/extension
 * @returns {String} Unique filename
 */
const generateLocalFilename = (originalFilename, format) => {
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const ext = format ? `.${format}` : path.extname(originalFilename);
  return `event-${timestamp}-${uniqueId}${ext}`;
};

/**
 * Save file to local storage
 * 
 * @param {Buffer} fileBuffer - File buffer to save
 * @param {Object} options - Save options
 * @returns {Promise<Object>} Save result with URL and metadata
 */
const saveLocally = async (fileBuffer, options = {}) => {
  try {
    await ensureDirectories();

    const {
      filename,
      format = 'webp',
      originalFilename = 'image'
    } = options;

    const finalFilename = filename || generateLocalFilename(originalFilename, format);
    const filePath = path.join(IMAGES_DIR, finalFilename);

    // Write file to disk
    await fs.writeFile(filePath, fileBuffer);

    // Generate public URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const publicUrl = `${baseUrl}/uploads/images/${finalFilename}`;

    return {
      success: true,
      url: publicUrl,
      path: filePath,
      filename: finalFilename,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error('Local storage error:', error);
    throw new Error(`Local storage failed: ${error.message}`);
  }
};

/**
 * Delete file from local storage
 * 
 * @param {String} filename - Filename to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteLocally = async (filename) => {
  try {
    // Remove any path traversal attempts
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(IMAGES_DIR, sanitizedFilename);

    // Check if file exists
    const fileExists = fsSync.existsSync(filePath);
    if (!fileExists) {
      throw new Error('File not found');
    }

    // Delete file
    await fs.unlink(filePath);

    return {
      success: true,
      message: 'File deleted successfully',
      filename: sanitizedFilename
    };
  } catch (error) {
    console.error('Local delete error:', error);
    throw new Error(`Local deletion failed: ${error.message}`);
  }
};

/**
 * Extract filename from local URL
 * 
 * @param {String} url - Full local URL
 * @returns {String} Filename
 */
const extractFilenameFromUrl = (url) => {
  try {
    // Extract filename from URL like http://localhost:5173/uploads/images/filename.webp
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  } catch (error) {
    throw new Error(`Invalid local URL: ${error.message}`);
  }
};

/**
 * Check if file exists locally
 * 
 * @param {String} filename - Filename to check
 * @returns {Boolean} True if file exists
 */
const fileExists = (filename) => {
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(IMAGES_DIR, sanitizedFilename);
  return fsSync.existsSync(filePath);
};

/**
 * Clean up temporary files
 * Removes files older than specified age from temp directory
 * 
 * @param {Number} maxAge - Maximum age in milliseconds (default: 1 hour)
 */
const cleanupTempFiles = async (maxAge = 60 * 60 * 1000) => {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.unlink(filePath);
        console.log(`Cleaned up temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};

/**
 * Get file info
 * 
 * @param {String} filename - Filename
 * @returns {Promise<Object>} File information
 */
const getFileInfo = async (filename) => {
  try {
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(IMAGES_DIR, sanitizedFilename);

    if (!fsSync.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const stats = await fs.stat(filePath);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    return {
      filename: sanitizedFilename,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      url: `${baseUrl}/uploads/images/${sanitizedFilename}`
    };
  } catch (error) {
    throw new Error(`Failed to get file info: ${error.message}`);
  }
};

module.exports = {
  saveLocally,
  deleteLocally,
  extractFilenameFromUrl,
  fileExists,
  cleanupTempFiles,
  getFileInfo,
  ensureDirectories,
  UPLOAD_DIR,
  IMAGES_DIR,
  TEMP_DIR
};




