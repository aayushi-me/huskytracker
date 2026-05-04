/**
 * Like Repository
 * Handles all database operations for likes
 * Uses repository pattern to separate data access from business logic
 */

const { Like } = require('../models/Like');
const mongoose = require('mongoose');

class LikeRepository {
  /**
   * Create a new like
   * @param {Object} likeData - Like data
   * @returns {Promise<Like>} Created like
   */
  async create(likeData) {
    const like = new Like(likeData);
    return await like.save();
  }

  /**
   * Find like by ID
   * @param {String} likeId - Like ID
   * @param {Object} options - Query options
   * @returns {Promise<Like|null>} Like document or null
   */
  async findById(likeId, options = {}) {
    const query = Like.findById(likeId);
    
    if (options.populate) {
      if (options.populate.includes('user')) {
        query.populate('user', 'firstName lastName email');
      }
      if (options.populate.includes('event')) {
        query.populate('event');
      }
    }
    
    if (options.lean) {
      query.lean();
    }
    
    return await query;
  }

  /**
   * Find like by user and event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Like|null>} Like document or null
   */
  async findByUserAndEvent(userId, eventId, options = {}) {
    const query = Like.findOne({ user: userId, event: eventId });
    
    if (options.populate) {
      if (options.populate.includes('user')) {
        query.populate('user', 'firstName lastName email');
      }
    }
    
    if (options.lean) {
      query.lean();
    }
    
    return await query;
  }

  /**
   * Check if like exists
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Boolean>} True if like exists
   */
  async exists(userId, eventId) {
    const count = await Like.countDocuments({ user: userId, event: eventId });
    return count > 0;
  }

  /**
   * Find all likes for an event
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of likes
   */
  async findByEvent(eventId, options = {}) {
    const {
      limit = 100,
      skip = 0,
      populate = false,
      lean = false
    } = options;

    const query = Like.find({ event: eventId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (populate) {
      query.populate('user', 'firstName lastName email');
    }

    if (lean) {
      query.lean();
    }

    return await query;
  }

  /**
   * Get like count for an event
   * @param {String} eventId - Event ID
   * @returns {Promise<Number>} Count of likes
   */
  async getEventLikeCount(eventId) {
    return await Like.getEventLikeCount(eventId);
  }

  /**
   * Delete like by ID
   * @param {String} likeId - Like ID
   * @returns {Promise<Like|null>} Deleted like
   */
  async delete(likeId) {
    return await Like.findByIdAndDelete(likeId);
  }

  /**
   * Delete like by user and event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByUserAndEvent(userId, eventId) {
    return await Like.deleteOne({ user: userId, event: eventId });
  }

  /**
   * Toggle like (create if doesn't exist, delete if exists)
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} { liked: boolean, like: Like|null }
   */
  async toggleLike(userId, eventId) {
    const existingLike = await this.findByUserAndEvent(userId, eventId);
    
    if (existingLike) {
      await this.delete(existingLike._id);
      return { liked: false, like: null };
    } else {
      const like = await this.create({ user: userId, event: eventId });
      return { liked: true, like };
    }
  }

  /**
   * Count likes by event
   * @param {String} eventId - Event ID
   * @returns {Promise<Number>} Count
   */
  async countByEvent(eventId) {
    return await Like.countDocuments({ event: eventId });
  }
}

module.exports = new LikeRepository();

