/**
 * Multer Configuration
 * Handles file upload configuration including file size limits, allowed types, and storage
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// File size limit: 5MB
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB in bytes

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * File filter function to validate file types
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file object
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`),
      false
    );
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`),
      false
    );
  }

  // File is valid
  cb(null, true);
};

/**
 * Generate unique filename
 * @param {Object} file - Uploaded file object
 * @returns {String} Unique filename
 */
const generateFilename = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  return `event-${timestamp}-${uniqueId}${ext}`;
};

/**
 * Memory storage configuration (for S3 uploads)
 * Files are stored in memory as Buffer for processing and S3 upload
 */
const memoryStorage = multer.memoryStorage();

/**
 * Disk storage configuration (for local development)
 * Files are temporarily stored on disk
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file));
  }
});

/**
 * Multer configuration for S3 uploads (using memory storage)
 */
const uploadMemory = multer({
  storage: memoryStorage,
  limits: {
    fileSize: FILE_SIZE_LIMIT,
    files: 1 // Only allow single file upload
  },
  fileFilter: fileFilter
});

/**
 * Multer configuration for local storage (using disk storage)
 */
const uploadDisk = multer({
  storage: diskStorage,
  limits: {
    fileSize: FILE_SIZE_LIMIT,
    files: 1
  },
  fileFilter: fileFilter
});

/**
 * Get appropriate multer upload based on environment
 * Uses memory storage for S3, disk storage for local
 */
const getUploadMiddleware = () => {
  const storageType = process.env.STORAGE_TYPE || 'local';
  return storageType === 's3' ? uploadMemory : uploadDisk;
};

module.exports = {
  uploadMemory,
  uploadDisk,
  getUploadMiddleware,
  generateFilename,
  FILE_SIZE_LIMIT,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};




