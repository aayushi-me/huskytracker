/**
 * Like Service
 * Contains business logic for like management
 * Handles validation, attendance verification, and coordinates with repository
 */

const likeRepository = require('../repositories/likeRepository');
const { Event, EventStatus } = require('../models/Event');
const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

class LikeService {
  /**
   * Check if user attended an event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Boolean>} True if user attended
   */
  async checkUserAttendance(userId, eventId) {
    const registration = await EventRegistration.findOne({
      user: userId,
      event: eventId,
      status: RegistrationStatus.ATTENDED
    });
    return !!registration;
  }

  /**
   * Toggle like (create if doesn't exist, delete if exists)
   * Requires user to have attended the event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} { liked: boolean, like: Like|null, likeCount: number }
   */
  async toggleLike(userId, eventId) {
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check if event is completed
    const now = new Date();
    if (event.endDate > now || event.status !== EventStatus.COMPLETED) {
      throw new ValidationError('You can only like completed events');
    }

    // Verify user attended the event
    const didAttend = await this.checkUserAttendance(userId, eventId);
    if (!didAttend) {
      throw new ForbiddenError('Only attendees can like events');
    }

    // Toggle like
    const result = await likeRepository.toggleLike(userId, eventId);

    // Get updated like count
    const likeCount = await likeRepository.getEventLikeCount(eventId);

    return {
      ...result,
      likeCount
    };
  }

  /**
   * Check if user has liked an event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} { liked: boolean, like: Like|null, likeCount: number, canLike: boolean }
   */
  async checkLike(userId, eventId) {
    const like = await likeRepository.findByUserAndEvent(userId, eventId, {
      populate: ['user']
    });
    const likeCount = await likeRepository.getEventLikeCount(eventId);

    // Check if user can like (attended and event is completed)
    let canLike = false;
    try {
      const event = await Event.findById(eventId);
      if (event) {
        const now = new Date();
        const isCompleted = event.endDate <= now || event.status === EventStatus.COMPLETED;
        if (isCompleted) {
          const didAttend = await this.checkUserAttendance(userId, eventId);
          canLike = didAttend;
        }
      }
    } catch (error) {
      // If error checking, default to false
      canLike = false;
    }

    return {
      liked: !!like,
      like: like || null,
      likeCount,
      canLike
    };
  }

  /**
   * Get like count for an event (public)
   * @param {String} eventId - Event ID
   * @returns {Promise<Number>} Like count
   */
  async getLikeCount(eventId) {
    return await likeRepository.getEventLikeCount(eventId);
  }

  /**
   * Get likes for an event
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of likes
   */
  async getEventLikes(eventId, options = {}) {
    return await likeRepository.findByEvent(eventId, {
      ...options,
      populate: true
    });
  }

  /**
   * Delete a specific like
   * @param {String} likeId - Like ID
   * @param {String} userId - User ID making the request
   * @returns {Promise<Object>} Deletion result
   */
  async deleteLike(likeId, userId) {
    const like = await likeRepository.findById(likeId);

    if (!like) {
      throw new NotFoundError('Like not found');
    }

    // Verify user owns the like
    if (like.user.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to delete this like');
    }

    await likeRepository.delete(likeId);

    return { deleted: true };
  }
}

module.exports = new LikeService();

