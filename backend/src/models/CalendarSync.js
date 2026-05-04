const mongoose = require('mongoose');

/**
 * CalendarProvider Enum
 * Represents supported calendar providers
 */
const CalendarProvider = {
  GOOGLE: 'GOOGLE',
  OUTLOOK: 'OUTLOOK',
  APPLE: 'APPLE',
  ICAL: 'ICAL'
};

/**
 * SyncStatus Enum
 * Represents the sync status
 */
const SyncStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ERROR: 'ERROR',
  DISCONNECTED: 'DISCONNECTED'
};

/**
 * CalendarSync Schema
 * Represents a user's calendar synchronization settings
 */
const CalendarSyncSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  provider: {
    type: String,
    required: [true, 'Calendar provider is required'],
    enum: {
      values: Object.values(CalendarProvider),
      message: 'Invalid calendar provider'
    },
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: Object.values(SyncStatus),
      message: 'Invalid sync status'
    },
    default: SyncStatus.ACTIVE,
    index: true
  },
  calendarId: {
    type: String,
    required: [true, 'Calendar ID is required'],
    trim: true,
    maxlength: [500, 'Calendar ID cannot exceed 500 characters']
  },
  accessToken: {
    type: String,
    required: [true, 'Access token is required'],
    trim: true
  },
  refreshToken: {
    type: String,
    trim: true,
    default: null
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  syncDirection: {
    type: String,
    enum: {
      values: ['IMPORT', 'EXPORT', 'BIDIRECTIONAL'],
      message: 'Invalid sync direction'
    },
    default: 'EXPORT'
  },
  syncFilters: {
    categories: [{
      type: String,
      trim: true
    }],
    includePastEvents: {
      type: Boolean,
      default: false
    },
    includeCancelledEvents: {
      type: Boolean,
      default: false
    }
  },
  errorMessage: {
    type: String,
    trim: true,
    maxlength: [1000, 'Error message cannot exceed 1000 characters'],
    default: null
  },
  errorOccurredAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: A user can only have one sync per provider
CalendarSyncSchema.index({ user: 1, provider: 1 }, { unique: true });

// Indexes for frequent queries
CalendarSyncSchema.index({ user: 1, status: 1 }); // For user's active syncs
CalendarSyncSchema.index({ status: SyncStatus.ACTIVE, lastSyncAt: 1 }); // For sync jobs

// Virtual property: Check if sync is active
CalendarSyncSchema.virtual('isActive').get(function() {
  return this.status === SyncStatus.ACTIVE;
});

// Virtual property: Check if token is expired
CalendarSyncSchema.virtual('isTokenExpired').get(function() {
  if (!this.tokenExpiresAt) {
    return false;
  }
  return this.tokenExpiresAt < new Date();
});

// Pre-save hook: Update lastSyncAt when sync is performed
CalendarSyncSchema.pre('save', function(next) {
  // This would be called manually after a sync operation
  next();
});

/**
 * Model Methods
 */

/**
 * Find user's calendar syncs
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of calendar syncs
 */
CalendarSyncSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0);
};

/**
 * Find active syncs for a user
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of active calendar syncs
 */
CalendarSyncSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    user: userId,
    status: SyncStatus.ACTIVE
  });
};

/**
 * Find sync by user and provider
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {String} provider - Calendar provider
 * @returns {Promise<CalendarSync|null>} Calendar sync document or null
 */
CalendarSyncSchema.statics.findByUserAndProvider = function(userId, provider) {
  return this.findOne({ user: userId, provider });
};

/**
 * Find all active syncs that need token refresh
 * @returns {Promise<Array>} Array of syncs needing token refresh
 */
CalendarSyncSchema.statics.findNeedingTokenRefresh = function() {
  return this.find({
    status: SyncStatus.ACTIVE,
    $or: [
      { tokenExpiresAt: { $lt: new Date() } },
      { tokenExpiresAt: { $exists: false } }
    ]
  });
};

/**
 * Activate sync
 * @returns {Promise<CalendarSync>} Updated calendar sync document
 */
CalendarSyncSchema.methods.activate = function() {
  this.status = SyncStatus.ACTIVE;
  this.errorMessage = null;
  this.errorOccurredAt = null;
  return this.save();
};

/**
 * Pause sync
 * @returns {Promise<CalendarSync>} Updated calendar sync document
 */
CalendarSyncSchema.methods.pause = function() {
  this.status = SyncStatus.PAUSED;
  return this.save();
};

/**
 * Mark sync as error
 * @param {String} errorMessage - Error message
 * @returns {Promise<CalendarSync>} Updated calendar sync document
 */
CalendarSyncSchema.methods.markError = function(errorMessage) {
  this.status = SyncStatus.ERROR;
  this.errorMessage = errorMessage;
  this.errorOccurredAt = new Date();
  return this.save();
};

/**
 * Disconnect sync
 * @returns {Promise<CalendarSync>} Updated calendar sync document
 */
CalendarSyncSchema.methods.disconnect = function() {
  this.status = SyncStatus.DISCONNECTED;
  this.accessToken = null;
  this.refreshToken = null;
  this.tokenExpiresAt = null;
  return this.save();
};

/**
 * Update last sync timestamp
 * @returns {Promise<CalendarSync>} Updated calendar sync document
 */
CalendarSyncSchema.methods.updateLastSync = function() {
  this.lastSyncAt = new Date();
  return this.save();
};

/**
 * Update tokens
 * @param {String} accessToken - New access token
 * @param {String} refreshToken - New refresh token (optional)
 * @param {Date} expiresAt - Token expiration date (optional)
 * @returns {Promise<CalendarSync>} Updated calendar sync document
 */
CalendarSyncSchema.methods.updateTokens = function(accessToken, refreshToken = null, expiresAt = null) {
  this.accessToken = accessToken;
  if (refreshToken) {
    this.refreshToken = refreshToken;
  }
  if (expiresAt) {
    this.tokenExpiresAt = expiresAt;
  }
  return this.save();
};

const CalendarSync = mongoose.model('CalendarSync', CalendarSyncSchema);

module.exports = { CalendarSync, CalendarProvider, SyncStatus };

