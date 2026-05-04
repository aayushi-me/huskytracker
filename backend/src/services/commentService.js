/**
 * Comment Service
 * Handles all business logic for comment operations
 * Includes attendance verification, rating validation, flagging, and moderation
 */

const commentRepository = require('../repositories/commentRepository');
const eventRegistrationRepository = require('../repositories/eventRegistrationRepository');
const eventRepository = require('../repositories/eventRepository');
const notificationService = require('./notificationService');
const { Notification, NotificationType } = require('../models/Notification');
const { RegistrationStatus } = require('../models/EventRegistration');
const { EventStatus } = require('../models/Event');
const User = require('../models/User');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError
} = require('../utils/errors');

class CommentService {

  /**
   * Verify if user attended the event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Boolean>} True if user attended
   */
  async verifyAttendance(userId, eventId) {
    // Check if event exists and is completed
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Allow comments only after event has ended
    if (event.endDate > new Date()) {
      return false;
    }

    // Find user's registration
    const registration = await eventRegistrationRepository.findByUserAndEvent(userId, eventId);

    if (!registration) {
      return false;
    }

    // User must have attended status
    return registration.status === RegistrationStatus.ATTENDED;
  }

  /**
   * Validate rating value
   * @param {Number} rating - Rating value
   * @throws {BadRequestError} If rating is invalid
   */
  validateRating(rating) {
    if (rating === null || rating === undefined) {
      return; // Rating is optional
    }

    // Convert to number if it's a string
    const numRating = typeof rating === 'string' ? parseInt(rating, 10) : rating;

    if (!Number.isInteger(numRating) || isNaN(numRating)) {
      throw new BadRequestError('Rating must be an integer');
    }

    if (numRating < 1 || numRating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5');
    }

    // Return the validated number
    return numRating;
  }

  /**
   * Validate comment content
   * @param {String} content - Comment content
   * @throws {BadRequestError} If content is invalid
   */
  validateContent(content) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestError('Comment content is required');
    }

    if (content.length > 2000) {
      throw new BadRequestError('Comment content cannot exceed 2000 characters');
    }
  }

  /**
   * Create a new comment
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @param {Object} commentData - Comment data (content, rating)
   * @returns {Promise<Object>} Created comment
   */
  async createComment(userId, eventId, commentData) {
    const { content, rating } = commentData;

    // Validate input
    this.validateContent(content);
    
    // Validate and normalize rating
    let validatedRating = null;
    if (rating !== null && rating !== undefined) {
      validatedRating = this.validateRating(rating);
    }

    // Verify user attended the event
    const attended = await this.verifyAttendance(userId, eventId);
    
    if (!attended) {
      throw new ForbiddenError('Only attendees can comment on events');
    }

    // Check if user already commented on this event
    const existingComments = await commentRepository.findByUser(userId, { limit: 1000, lean: true });
    const alreadyCommented = existingComments.some(
      comment => comment.event._id.toString() === eventId.toString()
    );

    if (alreadyCommented) {
      throw new BadRequestError('You have already commented on this event');
    }

    // Create comment
    const comment = await commentRepository.create({
      user: userId,
      event: eventId,
      content: content.trim(),
      rating: validatedRating
    });

    // Send notification to event organizer (async, don't block)
    this.sendCommentNotificationToOrganizer(eventId, userId, comment._id)
      .catch(err => console.error('Failed to send comment notification:', err));

    // Fetch and return populated comment
    return await commentRepository.findById(comment._id, {
      populate: ['user', 'event']
    });
  }

  /**
   * Update a comment
   * @param {String} commentId - Comment ID
   * @param {String} userId - User ID (must be comment author)
   * @param {Object} updateData - Update data (content, rating)
   * @returns {Promise<Object>} Updated comment
   */
  async updateComment(commentId, userId, updateData) {
    const { content, rating } = updateData;

    // Find comment
    const comment = await commentRepository.findById(commentId);
    
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Verify ownership
    if (comment.user._id.toString() !== userId.toString()) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    // Prepare update data
    const updates = {};

    // Validate new content if provided
    if (content !== undefined) {
      this.validateContent(content);
      updates.content = content.trim();
    }

    // Validate and normalize new rating if provided
    if (rating !== undefined && rating !== null) {
      updates.rating = this.validateRating(rating);
    } else if (rating === null) {
      updates.rating = null;
    }

    // Update comment
    const updatedComment = await commentRepository.update(commentId, updates);

    // Return populated comment
    return await commentRepository.findById(commentId, {
      populate: ['user', 'event']
    });
  }

  /**
   * Delete a comment
   * @param {String} commentId - Comment ID
   * @param {String} userId - User ID
   * @param {String} userRole - User role
   * @returns {Promise<void>}
   */
  async deleteComment(commentId, userId, userRole) {
    // Find comment
    const comment = await commentRepository.findById(commentId);
    
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check authorization: owner or moderator/admin
    const isOwner = comment.user._id.toString() === userId.toString();
    const isModerator = userRole === 'ADMIN' || userRole === 'MODERATOR';

    if (!isOwner && !isModerator) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    // Delete comment (soft delete)
    await commentRepository.delete(commentId);
  }

  /**
   * Get comments for an event
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options (page, limit, sort)
   * @returns {Promise<Object>} Comments and pagination metadata
   */
  async getEventComments(eventId, options = {}) {
    // Verify event exists
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Get comments with pagination
    const result = await commentRepository.findByEvent(eventId, {
      page: options.page || 1,
      limit: Math.min(options.limit || 10, 50), // Max 50 per page
      sort: options.sort || 'newest',
      includeFlagged: false
    });

    return result;
  }

  /**
   * Flag a comment as inappropriate
   * @param {String} commentId - Comment ID
   * @param {String} userId - User ID who is flagging
   * @param {String} reason - Flag reason
   * @returns {Promise<Object>} Flagged comment
   */
  async flagComment(commentId, userId, reason) {
    // Find comment
    const comment = await commentRepository.findById(commentId, {
      populate: ['user', 'event']
    });
    
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Prevent users from flagging their own comments
    if (comment.user._id.toString() === userId.toString()) {
      throw new BadRequestError('You cannot flag your own comment');
    }

    // Validate reason
    const validReasons = ['spam', 'inappropriate', 'harassment', 'off_topic', 'other'];
    if (!validReasons.includes(reason)) {
      throw new BadRequestError('Invalid flag reason');
    }

    // Flag the comment
    const flaggedComment = await commentRepository.flag(commentId, userId, reason);

    // Send notification to moderators (async, don't block)
    this.sendFlagNotificationToModerators(commentId, userId, reason)
      .catch(err => console.error('Failed to send flag notification:', err));

    return flaggedComment;
  }

  /**
   * Unflag a comment (moderator only)
   * @param {String} commentId - Comment ID
   * @param {String} userRole - User role (must be admin or moderator)
   * @returns {Promise<Object>} Unflagged comment
   */
  async unflagComment(commentId, userRole) {
    // Verify moderator role
    if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
      throw new ForbiddenError('Only moderators can unflag comments');
    }

    // Find comment
    const comment = await commentRepository.findById(commentId);
    
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Unflag the comment
    const unflaggedComment = await commentRepository.unflag(commentId);

    return unflaggedComment;
  }

  /**
   * Get all flagged comments (moderator only)
   * @param {String} userRole - User role (must be admin or moderator)
   * @param {Object} options - Query options (page, limit)
   * @returns {Promise<Object>} Flagged comments and pagination
   */
  async getFlaggedComments(userRole, options = {}) {
    // Verify moderator role
    if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
      throw new ForbiddenError('Only moderators can view flagged comments');
    }

    // Get flagged comments with pagination
    const result = await commentRepository.findFlagged({
      page: options.page || 1,
      limit: Math.min(options.limit || 20, 50)
    });

    return result;
  }

  /**
   * Get comment statistics for an event
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Comment statistics
   */
  async getCommentStats(eventId) {
    // Verify event exists
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return await commentRepository.getEventStats(eventId);
  }

  /**
   * Send notification to event organizer about new comment
   * @param {String} eventId - Event ID
   * @param {String} commenterId - Commenter user ID
   * @param {String} commentId - Comment ID
   * @private
   */
  async sendCommentNotificationToOrganizer(eventId, commenterId, commentId) {
    try {
      const event = await eventRepository.findById(eventId, { populate: ['organizer'] });
      const commenter = await User.findById(commenterId);
      const comment = await commentRepository.findById(commentId);

      if (!event || !commenter || !comment) {
        return;
      }

      // Don't notify if organizer commented on their own event
      if (event.organizer._id.toString() === commenterId.toString()) {
        return;
      }

      await notificationService.notifyNewComment(
        eventId,
        commenterId,
        comment.content
      );
    } catch (error) {
      console.error('Error sending comment notification:', error);
    }
  }

  /**
   * Send notification to moderators about flagged comment
   * @param {String} commentId - Comment ID
   * @param {String} flaggerId - User ID who flagged
   * @param {String} reason - Flag reason
   * @private
   */
  async sendFlagNotificationToModerators(commentId, flaggerId, reason) {
    try {
      const comment = await commentRepository.findById(commentId, {
        populate: ['event', 'user']
      });
      const flagger = await User.findById(flaggerId);

      if (!comment || !flagger) {
        return;
      }

      // Find all moderators and admins
      const moderators = await User.find({
        role: { $in: ['ADMIN', 'MODERATOR'] },
        isActive: true
      });

      // Create notification for each moderator
      const notifications = moderators.map(moderator => ({
        user: moderator._id,
        type: NotificationType.NEW_COMMENT, // Use existing type or add COMMENT_FLAGGED
        title: 'Comment Flagged for Review',
        message: `A comment on "${comment.event.title}" was flagged for ${reason}`,
        comment: commentId,
        event: comment.event._id,
        actionUrl: `/admin/comments/flagged`,
        metadata: {
          reason,
          flaggerId,
          flaggerName: `${flagger.firstName} ${flagger.lastName}`
        }
      }));

      await Notification.insertMany(notifications);
    } catch (error) {
      console.error('Error sending flag notification:', error);
    }
  }
}

// Create singleton instance
const commentService = new CommentService();

module.exports = commentService;

