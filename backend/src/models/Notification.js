const mongoose = require('mongoose');

/**
 * NotificationType Enum
 * Represents the type of notification
 */
const NotificationType = {
  EVENT_REMINDER: 'EVENT_REMINDER',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  NEW_COMMENT: 'NEW_COMMENT',
  COMMENT_REPLY: 'COMMENT_REPLY',
  REGISTRATION_CONFIRMED: 'REGISTRATION_CONFIRMED',
  REGISTRATION_WAITLISTED: 'REGISTRATION_WAITLISTED',
  REGISTRATION_APPROVED: 'REGISTRATION_APPROVED',
  EVENT_INVITATION: 'EVENT_INVITATION',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT'
};

/**
 * NotificationStatus Enum
 * Represents the status of a notification
 */
const NotificationStatus = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  ARCHIVED: 'ARCHIVED'
};

/**
 * Notification Schema
 * Represents a notification sent to a user
 */
const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: {
      values: Object.values(NotificationType),
      message: 'Invalid notification type'
    },
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: Object.values(NotificationStatus),
      message: 'Invalid notification status'
    },
    default: NotificationStatus.UNREAD,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null,
    index: true
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  registration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventRegistration',
    default: null
  },
  actionUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Action URL cannot exceed 500 characters']
  },
  readAt: {
    type: Date,
    default: null
  },
  archivedAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for frequent queries
NotificationSchema.index({ user: 1, status: 1, createdAt: -1 }); // For user's notifications
NotificationSchema.index({ user: 1, type: 1 }); // For filtering by type
NotificationSchema.index({ status: NotificationStatus.UNREAD, createdAt: -1 }); // For unread notifications
NotificationSchema.index({ event: 1 }); // For event-related notifications

// Virtual property: Check if notification is unread
NotificationSchema.virtual('isUnread').get(function() {
  return this.status === NotificationStatus.UNREAD;
});

// Pre-save hook: Set readAt when status changes to READ
NotificationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === NotificationStatus.READ && !this.readAt) {
      this.readAt = new Date();
    }
    if (this.status === NotificationStatus.ARCHIVED && !this.archivedAt) {
      this.archivedAt = new Date();
    }
  }
  next();
});

/**
 * Model Methods
 */

/**
 * Find user's notifications
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of notifications
 */
NotificationSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .populate('event', 'title startDate')
    .populate('comment', 'content')
    .populate('registration')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find user's unread notifications
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of unread notifications
 */
NotificationSchema.statics.findUnreadByUser = function(userId, options = {}) {
  return this.find({
    user: userId,
    status: NotificationStatus.UNREAD
  })
    .populate('event', 'title startDate')
    .populate('comment', 'content')
    .populate('registration')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Get unread notification count for a user
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<Number>} Count of unread notifications
 */
NotificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    user: userId,
    status: NotificationStatus.UNREAD
  });
};

/**
 * Mark notification as read
 * @returns {Promise<Notification>} Updated notification document
 */
NotificationSchema.methods.markAsRead = function() {
  this.status = NotificationStatus.READ;
  this.readAt = new Date();
  return this.save();
};

/**
 * Mark notification as archived
 * @returns {Promise<Notification>} Updated notification document
 */
NotificationSchema.methods.archive = function() {
  this.status = NotificationStatus.ARCHIVED;
  this.archivedAt = new Date();
  return this.save();
};

/**
 * Mark all user's notifications as read
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<Object>} Update result
 */
NotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { user: userId, status: NotificationStatus.UNREAD },
    {
      status: NotificationStatus.READ,
      readAt: new Date()
    }
  );
};

/**
 * Create a notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Notification>} Created notification
 */
NotificationSchema.statics.createNotification = function(notificationData) {
  return this.create(notificationData);
};

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = { Notification, NotificationType, NotificationStatus };

