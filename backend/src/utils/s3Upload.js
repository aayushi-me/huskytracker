/**
 * AWS S3 Upload Utility
 * Handles uploading files to AWS S3 bucket
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Initialize S3 Client
 */
const initializeS3Client = () => {
  // Check for required environment variables
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.');
  }

  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS S3 bucket name not configured. Set AWS_S3_BUCKET_NAME in environment variables.');
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  return s3Client;
};

/**
 * Generate unique S3 key (filename)
 * 
 * @param {String} originalFilename - Original file name
 * @param {String} format - File format/extension
 * @returns {String} Unique S3 key
 */
const generateS3Key = (originalFilename, format) => {
  const timestamp = Date.now();
  const uniqueId = uuidv4();
  const ext = format ? `.${format}` : path.extname(originalFilename);
  return `events/${timestamp}-${uniqueId}${ext}`;
};

/**
 * Upload file to S3
 * 
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
const uploadToS3 = async (fileBuffer, options = {}) => {
  try {
    const {
      filename,
      contentType = 'image/webp',
      format = 'webp'
    } = options;

    const s3Client = initializeS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const s3Key = filename || generateS3Key('image', format);

    // Prepare upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000', // Cache for 1 year
      ServerSideEncryption: 'AES256' // Enable encryption at rest
    };

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate public URL
    const region = process.env.AWS_REGION || 'us-east-1';
    let publicUrl;

    // Use CloudFront URL if configured (and not null/empty), otherwise use S3 URL
    const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    if (cloudFrontDomain && cloudFrontDomain !== 'NULL' && cloudFrontDomain !== 'null' && cloudFrontDomain.trim() !== '') {
      publicUrl = `https://${cloudFrontDomain}/${s3Key}`;
    } else {
      publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    }

    return {
      success: true,
      url: publicUrl,
      key: s3Key,
      bucket: bucketName,
      size: fileBuffer.length,
      contentType: contentType
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * 
 * @param {String} s3Key - S3 object key to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromS3 = async (s3Key) => {
  try {
    const s3Client = initializeS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    const deleteParams = {
      Bucket: bucketName,
      Key: s3Key
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return {
      success: true,
      message: 'File deleted successfully',
      key: s3Key
    };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`S3 deletion failed: ${error.message}`);
  }
};

/**
 * Extract S3 key from URL
 * 
 * @param {String} url - Full S3 or CloudFront URL
 * @returns {String} S3 key
 */
const extractS3KeyFromUrl = (url) => {
  try {
    // Handle CloudFront URLs
    if (url.includes(process.env.AWS_CLOUDFRONT_DOMAIN)) {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    }

    // Handle S3 URLs
    if (url.includes('.s3.') && url.includes('.amazonaws.com')) {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    }

    // If it's just a key, return as is
    return url;
  } catch (error) {
    throw new Error(`Invalid S3 URL: ${error.message}`);
  }
};

/**
 * Check if S3 is configured
 * 
 * @returns {Boolean} True if S3 credentials are configured
 */
const isS3Configured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  generateS3Key,
  extractS3KeyFromUrl,
  isS3Configured
};

