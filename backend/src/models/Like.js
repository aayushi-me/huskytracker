const mongoose = require('mongoose');

/**
 * Like Schema
 * Represents a user's like on an event or comment
 */
const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: function() {
      return !this.comment; // Either event or comment must be provided
    },
    index: true
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: function() {
      return !this.event; // Either event or comment must be provided
    },
    index: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: A user can only like an event once
LikeSchema.index({ user: 1, event: 1 }, { 
  unique: true, 
  sparse: true, // Allows null values in event field
  partialFilterExpression: { event: { $exists: true } }
});

// Compound unique index: A user can only like a comment once
LikeSchema.index({ user: 1, comment: 1 }, { 
  unique: true, 
  sparse: true, // Allows null values in comment field
  partialFilterExpression: { comment: { $exists: true } }
});

// Indexes for frequent queries
LikeSchema.index({ event: 1, createdAt: -1 }); // For event likes
LikeSchema.index({ comment: 1, createdAt: -1 }); // For comment likes
LikeSchema.index({ user: 1, createdAt: -1 }); // For user's likes

// Validation: Ensure either event or comment is provided, but not both
LikeSchema.pre('validate', function(next) {
  if (!this.event && !this.comment) {
    return next(new Error('Either event or comment must be provided'));
  }
  if (this.event && this.comment) {
    return next(new Error('Cannot like both event and comment in the same document'));
  }
  next();
});

// Post-save hook: Update comment's likeCount if this is a comment like
LikeSchema.post('save', async function(doc) {
  if (doc.comment) {
    try {
      const { Comment } = require('./Comment');
      const mongoose = require('mongoose');
      const LikeModel = mongoose.model('Like');
      const comment = await Comment.findById(doc.comment);
      if (comment) {
        const likeCount = await LikeModel.countDocuments({ comment: doc.comment });
        comment.likeCount = likeCount;
        await comment.save();
      }
    } catch (error) {
      console.error('Error updating comment like count:', error);
    }
  }
});

// Post-remove hook: Update comment's likeCount when like is deleted
LikeSchema.post('findOneAndDelete', async function(doc) {
  if (!doc || !doc.comment) return;
  try {
    const { Comment } = require('./Comment');
    const mongoose = require('mongoose');
    const LikeModel = mongoose.model('Like');
    const comment = await Comment.findById(doc.comment);
    if (comment) {
      const likeCount = await LikeModel.countDocuments({ comment: doc.comment });
      comment.likeCount = likeCount;
      await comment.save();
    }
  } catch (error) {
    console.error('Error updating comment like count:', error);
  }
});

// Post-delete hook: Update comment's likeCount
LikeSchema.post('deleteOne', async function() {
  try {
    const doc = this.getQuery();
    if (!doc._id) return;
    
    const mongoose = require('mongoose');
    const LikeModel = mongoose.model('Like');
    const like = await LikeModel.findById(doc._id);
    if (!like || !like.comment) return;

    const { Comment } = require('./Comment');
    const comment = await Comment.findById(like.comment);
    if (comment) {
      const likeCount = await LikeModel.countDocuments({ comment: like.comment });
      comment.likeCount = likeCount;
      await comment.save();
    }
  } catch (error) {
    console.error('Error updating comment like count:', error);
  }
});

/**
 * Model Methods
 */

/**
 * Find likes for an event
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of likes
 */
LikeSchema.statics.findByEvent = function(eventId, options = {}) {
  return this.find({ event: eventId })
    .populate('user', 'firstName lastName email avatar')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Find likes for a comment
 * @param {mongoose.Types.ObjectId} commentId - Comment ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of likes
 */
LikeSchema.statics.findByComment = function(commentId, options = {}) {
  return this.find({ comment: commentId })
    .populate('user', 'firstName lastName email avatar')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Find user's likes
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of likes
 */
LikeSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ user: userId })
    .populate('event', 'title startDate')
    .populate('comment', 'content')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Check if user has liked an event
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Like|null>} Like document or null
 */
LikeSchema.statics.findUserEventLike = function(userId, eventId) {
  return this.findOne({ user: userId, event: eventId });
};

/**
 * Check if user has liked a comment
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} commentId - Comment ID
 * @returns {Promise<Like|null>} Like document or null
 */
LikeSchema.statics.findUserCommentLike = function(userId, commentId) {
  return this.findOne({ user: userId, comment: commentId });
};

/**
 * Get like count for an event
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Number>} Count of likes
 */
LikeSchema.statics.getEventLikeCount = function(eventId) {
  return this.countDocuments({ event: eventId });
};

/**
 * Get like count for a comment
 * @param {mongoose.Types.ObjectId} commentId - Comment ID
 * @returns {Promise<Number>} Count of likes
 */
LikeSchema.statics.getCommentLikeCount = function(commentId) {
  return this.countDocuments({ comment: commentId });
};

/**
 * Toggle like for an event (create if doesn't exist, delete if exists)
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Object>} { liked: boolean, like: Like|null }
 */
LikeSchema.statics.toggleEventLike = async function(userId, eventId) {
  const existingLike = await this.findOne({ user: userId, event: eventId });
  
  if (existingLike) {
    await this.deleteOne({ _id: existingLike._id });
    return { liked: false, like: null };
  } else {
    const like = await this.create({ user: userId, event: eventId });
    return { liked: true, like };
  }
};

/**
 * Toggle like for a comment (create if doesn't exist, delete if exists)
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} commentId - Comment ID
 * @returns {Promise<Object>} { liked: boolean, like: Like|null }
 */
LikeSchema.statics.toggleCommentLike = async function(userId, commentId) {
  const existingLike = await this.findOne({ user: userId, comment: commentId });
  
  if (existingLike) {
    await this.deleteOne({ _id: existingLike._id });
    return { liked: false, like: null };
  } else {
    const like = await this.create({ user: userId, comment: commentId });
    return { liked: true, like };
  }
};

const Like = mongoose.model('Like', LikeSchema);

module.exports = { Like };

