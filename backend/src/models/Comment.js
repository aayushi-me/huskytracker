const mongoose = require('mongoose');

/**
 * Comment Schema
 * Represents a user's comment on an event
 */
const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required'],
    index: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null // null means top-level comment
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    minlength: [1, 'Comment cannot be empty'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    default: null // null means no rating provided (comment without rating)
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isFlagged: {
    type: Boolean,
    default: false,
    index: true
  },
  flaggedAt: {
    type: Date,
    default: null
  },
  flagReason: {
    type: String,
    trim: true,
    enum: {
      values: ['spam', 'inappropriate', 'harassment', 'off_topic', 'other'],
      message: 'Invalid flag reason'
    },
    default: null
  },
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  likeCount: {
    type: Number,
    default: 0,
    min: [0, 'Like count cannot be negative']
  },
  replyCount: {
    type: Number,
    default: 0,
    min: [0, 'Reply count cannot be negative']
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for frequent queries
CommentSchema.index({ event: 1, createdAt: -1 }); // For event comments list
CommentSchema.index({ user: 1, createdAt: -1 }); // For user's comments
CommentSchema.index({ parentComment: 1, createdAt: 1 }); // For comment replies
CommentSchema.index({ isFlagged: 1, isDeleted: 1 }); // For moderation queries

// Virtual property: Check if comment is a reply
CommentSchema.virtual('isReply').get(function() {
  return this.parentComment !== null;
});

// Virtual property: Check if comment is visible (not deleted and not flagged)
CommentSchema.virtual('isVisible').get(function() {
  return !this.isDeleted && !this.isFlagged;
});

// Pre-save hook: Set editedAt when content is modified
CommentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    if (!this.editedAt) {
      this.editedAt = new Date();
    }
  }
  next();
});

// Pre-save hook: Set flaggedAt when isFlagged changes to true
CommentSchema.pre('save', function(next) {
  if (this.isModified('isFlagged') && this.isFlagged && !this.flaggedAt) {
    this.flaggedAt = new Date();
  }
  next();
});

// Pre-save hook: Set deletedAt when isDeleted changes to true
CommentSchema.pre('save', function(next) {
  if (this.isModified('isDeleted') && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Post-save hook: Update parent comment's replyCount
CommentSchema.post('save', async function(doc) {
  if (doc.parentComment) {
    try {
      const mongoose = require('mongoose');
      const CommentModel = mongoose.model('Comment');
      const parentComment = await CommentModel.findById(doc.parentComment);
      if (parentComment) {
        const replyCount = await CommentModel.countDocuments({
          parentComment: doc.parentComment,
          isDeleted: false,
          isFlagged: false
        });
        parentComment.replyCount = replyCount;
        await parentComment.save();
      }
    } catch (error) {
      console.error('Error updating parent comment reply count:', error);
    }
  }
});

// Post-remove hook: Update parent comment's replyCount when reply is deleted
CommentSchema.post('findOneAndDelete', async function(doc) {
  if (!doc || !doc.parentComment) return;
  try {
    const mongoose = require('mongoose');
    const CommentModel = mongoose.model('Comment');
    const parentComment = await CommentModel.findById(doc.parentComment);
    if (parentComment) {
      const replyCount = await CommentModel.countDocuments({
        parentComment: doc.parentComment,
        isDeleted: false,
        isFlagged: false
      });
      parentComment.replyCount = replyCount;
      await parentComment.save();
    }
  } catch (error) {
    console.error('Error updating parent comment reply count:', error);
  }
});

/**
 * Model Methods
 */

/**
 * Find comments for an event
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of top-level comments
 */
CommentSchema.statics.findByEvent = function(eventId, options = {}) {
  return this.find({
    event: eventId,
    parentComment: null,
    isDeleted: false,
    isFlagged: false
  })
    .populate('user', 'firstName lastName email avatar')
    .sort({ createdAt: options.sort === 'oldest' ? 1 : -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find replies to a comment
 * @param {mongoose.Types.ObjectId} commentId - Parent comment ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of reply comments
 */
CommentSchema.statics.findReplies = function(commentId, options = {}) {
  return this.find({
    parentComment: commentId,
    isDeleted: false,
    isFlagged: false
  })
    .populate('user', 'firstName lastName email avatar')
    .sort({ createdAt: 1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find user's comments
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of comments
 */
CommentSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ user: userId, isDeleted: false })
    .populate('event', 'title startDate')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find flagged comments for moderation
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of flagged comments
 */
CommentSchema.statics.findFlagged = function(options = {}) {
  return this.find({ isFlagged: true, isDeleted: false })
    .populate('user', 'firstName lastName email')
    .populate('event', 'title')
    .populate('flaggedBy', 'firstName lastName email')
    .sort({ flaggedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Flag a comment
 * @param {mongoose.Types.ObjectId} commentId - Comment ID
 * @param {mongoose.Types.ObjectId} userId - User ID who is flagging
 * @param {String} reason - Flag reason
 * @returns {Promise<Comment>} Updated comment document
 */
CommentSchema.statics.flagComment = function(commentId, userId, reason) {
  return this.findByIdAndUpdate(
    commentId,
    {
      isFlagged: true,
      flaggedAt: new Date(),
      flagReason: reason,
      flaggedBy: userId
    },
    { new: true }
  );
};

/**
 * Delete a comment (soft delete)
 * @returns {Promise<Comment>} Updated comment document
 */
CommentSchema.methods.deleteComment = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

/**
 * Restore a deleted comment
 * @returns {Promise<Comment>} Updated comment document
 */
CommentSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

/**
 * Increment like count
 * @returns {Promise<Comment>} Updated comment document
 */
CommentSchema.methods.incrementLikes = function() {
  this.likeCount += 1;
  return this.save();
};

/**
 * Decrement like count
 * @returns {Promise<Comment>} Updated comment document
 */
CommentSchema.methods.decrementLikes = function() {
  if (this.likeCount > 0) {
    this.likeCount -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

/**
 * Increment reply count
 * @returns {Promise<Comment>} Updated comment document
 */
CommentSchema.methods.incrementReplies = function() {
  this.replyCount += 1;
  return this.save();
};

/**
 * Decrement reply count
 * @returns {Promise<Comment>} Updated comment document
 */
CommentSchema.methods.decrementReplies = function() {
  if (this.replyCount > 0) {
    this.replyCount -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = { Comment };

