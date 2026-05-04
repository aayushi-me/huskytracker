/**
 * UploadedImage Model
 * Tracks all uploaded images and their ownership
 */

const mongoose = require('mongoose');

const UploadedImageSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    unique: true,
    trim: true
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required'],
    index: true
  },
  storageType: {
    type: String,
    enum: ['s3', 'local'],
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  format: {
    type: String,
    required: true
  },
  dimensions: {
    width: Number,
    height: Number
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  usedInEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  metadata: {
    originalSize: Number,
    compressionRatio: String,
    quality: Number
  }
}, {
  timestamps: true
});

// Index for efficient queries
UploadedImageSchema.index({ uploadedBy: 1, createdAt: -1 });
UploadedImageSchema.index({ isUsed: 1, createdAt: -1 });
UploadedImageSchema.index({ imageUrl: 1 });

/**
 * Find images by uploader
 */
UploadedImageSchema.statics.findByUploader = function(userId, options = {}) {
  const query = { uploadedBy: userId };
  
  if (options.isUsed !== undefined) {
    query.isUsed = options.isUsed;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Find orphaned images (uploaded but not used in any event)
 */
UploadedImageSchema.statics.findOrphaned = function(olderThanDays = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  return this.find({
    isUsed: false,
    createdAt: { $lt: cutoffDate }
  });
};

/**
 * Mark image as used in an event
 */
UploadedImageSchema.methods.markAsUsed = function(eventId) {
  this.isUsed = true;
  this.usedInEvent = eventId;
  return this.save();
};

/**
 * Mark image as unused (when event is deleted)
 */
UploadedImageSchema.methods.markAsUnused = function() {
  this.isUsed = false;
  this.usedInEvent = null;
  return this.save();
};

const UploadedImage = mongoose.model('UploadedImage', UploadedImageSchema);

module.exports = UploadedImage;



