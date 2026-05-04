/**
 * Comment Repository
 * Handles all database operations for comments
 * Uses repository pattern to separate data access from business logic
 */

const { Comment } = require('../models/Comment');
const mongoose = require('mongoose');

class CommentRepository {
  
  /**
   * Create a new comment
   * @param {Object} commentData - Comment data
   * @returns {Promise<Comment>} Created comment
   */
  async create(commentData) {
    const comment = new Comment(commentData);
    return await comment.save();
  }

  /**
   * Find comment by ID
   * @param {String} commentId - Comment ID
   * @param {Object} options - Query options
   * @returns {Promise<Comment|null>} Comment document or null
   */
  async findById(commentId, options = {}) {
    const query = Comment.findOne({ _id: commentId, isDeleted: false });
    
    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(field => {
          if (field === 'user') {
            query.populate('user', 'firstName lastName email university');
          } else if (field === 'event') {
            query.populate('event', 'title startDate endDate');
          } else if (field === 'flaggedBy') {
            query.populate('flaggedBy', 'firstName lastName email');
          }
        });
      }
    }
    
    if (options.lean) {
      query.lean();
    }
    
    return await query;
  }

  /**
   * Find all comments for an event with pagination and filtering
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options (page, limit, sort, includeFlagged)
   * @returns {Promise<Object>} Comments and metadata
   */
  async findByEvent(eventId, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = 'newest',
      includeFlagged = false,
      lean = true
    } = options;

    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      event: eventId,
      parentComment: null, // Only top-level comments
      isDeleted: false
    };

    // Exclude flagged comments unless explicitly requested
    if (!includeFlagged) {
      filter.isFlagged = false;
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'highest_rated':
        sortObj = { rating: -1, createdAt: -1 };
        break;
      case 'lowest_rated':
        sortObj = { rating: 1, createdAt: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    // Build query
    const query = Comment.find(filter)
      .populate('user', 'firstName lastName email university')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    if (lean) {
      query.lean();
    }

    const [comments, totalCount] = await Promise.all([
      query,
      Comment.countDocuments(filter)
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Find replies to a comment
   * @param {String} parentCommentId - Parent comment ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of reply comments
   */
  async findReplies(parentCommentId, options = {}) {
    const {
      limit = 50,
      skip = 0,
      lean = true
    } = options;

    const query = Comment.find({
      parentComment: parentCommentId,
      isDeleted: false,
      isFlagged: false
    })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    if (lean) {
      query.lean();
    }

    return await query;
  }

  /**
   * Find all flagged comments for moderation
   * @param {Object} options - Query options (page, limit)
   * @returns {Promise<Object>} Flagged comments and metadata
   */
  async findFlagged(options = {}) {
    const {
      page = 1,
      limit = 20,
      lean = true
    } = options;

    const skip = (page - 1) * limit;

    const filter = {
      isFlagged: true,
      isDeleted: false
    };

    const query = Comment.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('event', 'title startDate')
      .populate('flaggedBy', 'firstName lastName email')
      .sort({ flaggedAt: -1 })
      .skip(skip)
      .limit(limit);

    if (lean) {
      query.lean();
    }

    const [comments, totalCount] = await Promise.all([
      query,
      Comment.countDocuments(filter)
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Find comments by user
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of comments
   */
  async findByUser(userId, options = {}) {
    const {
      limit = 50,
      skip = 0,
      lean = true
    } = options;

    const query = Comment.find({
      user: userId,
      isDeleted: false
    })
      .populate('event', 'title startDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (lean) {
      query.lean();
    }

    return await query;
  }

  /**
   * Update comment
   * @param {String} commentId - Comment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Comment|null>} Updated comment
   */
  async update(commentId, updateData) {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    
    if (!comment) {
      return null;
    }

    // Update allowed fields
    if (updateData.content !== undefined) {
      comment.content = updateData.content;
    }
    if (updateData.rating !== undefined) {
      comment.rating = updateData.rating;
    }

    return await comment.save();
  }

  /**
   * Flag a comment
   * @param {String} commentId - Comment ID
   * @param {String} userId - User ID who is flagging
   * @param {String} reason - Flag reason
   * @returns {Promise<Comment|null>} Updated comment
   */
  async flag(commentId, userId, reason) {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    
    if (!comment) {
      return null;
    }

    comment.isFlagged = true;
    comment.flaggedAt = new Date();
    comment.flagReason = reason;
    comment.flaggedBy = userId;

    return await comment.save();
  }

  /**
   * Unflag a comment (moderator action)
   * @param {String} commentId - Comment ID
   * @returns {Promise<Comment|null>} Updated comment
   */
  async unflag(commentId) {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    
    if (!comment) {
      return null;
    }

    comment.isFlagged = false;
    comment.flaggedAt = null;
    comment.flagReason = null;
    comment.flaggedBy = null;

    return await comment.save();
  }

  /**
   * Soft delete a comment
   * @param {String} commentId - Comment ID
   * @returns {Promise<Comment|null>} Deleted comment
   */
  async delete(commentId) {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    
    if (!comment) {
      return null;
    }

    return await comment.deleteComment();
  }

  /**
   * Get comment statistics for an event
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Comment statistics
   */
  async getEventStats(eventId) {
    const stats = await Comment.aggregate([
      {
        $match: {
          event: new mongoose.Types.ObjectId(eventId),
          isDeleted: false,
          isFlagged: false,
          rating: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalComments: { $sum: 1 },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        averageRating: 0,
        totalComments: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats[0].ratingDistribution.forEach(rating => {
      distribution[rating] = (distribution[rating] || 0) + 1;
    });

    return {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalComments: stats[0].totalComments,
      totalRatings: stats[0].totalRatings,
      ratingDistribution: distribution
    };
  }

  /**
   * Count comments for an event
   * @param {String} eventId - Event ID
   * @param {Boolean} includeFlagged - Include flagged comments in count
   * @returns {Promise<Number>} Comment count
   */
  async countByEvent(eventId, includeFlagged = false) {
    const filter = {
      event: eventId,
      isDeleted: false
    };

    if (!includeFlagged) {
      filter.isFlagged = false;
    }

    return await Comment.countDocuments(filter);
  }
}

// Create singleton instance
const commentRepository = new CommentRepository();

module.exports = commentRepository;

