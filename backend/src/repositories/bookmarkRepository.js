/**
 * Bookmark Repository
 * Handles all database operations for bookmarks
 * Uses repository pattern to separate data access from business logic
 */

const { Bookmark } = require('../models/Bookmark');
const mongoose = require('mongoose');

class BookmarkRepository {
  /**
   * Create a new bookmark
   * @param {Object} bookmarkData - Bookmark data
   * @returns {Promise<Bookmark>} Created bookmark
   */
  async create(bookmarkData) {
    const bookmark = new Bookmark(bookmarkData);
    return await bookmark.save();
  }

  /**
   * Find bookmark by ID
   * @param {String} bookmarkId - Bookmark ID
   * @param {Object} options - Query options
   * @returns {Promise<Bookmark|null>} Bookmark document or null
   */
  async findById(bookmarkId, options = {}) {
    const query = Bookmark.findById(bookmarkId);
    
    if (options.populate) {
      if (options.populate.includes('event')) {
        query.populate('event');
      }
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
   * Find bookmark by user and event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Bookmark|null>} Bookmark document or null
   */
  async findByUserAndEvent(userId, eventId, options = {}) {
    const query = Bookmark.findOne({ user: userId, event: eventId });
    
    if (options.populate) {
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
   * Check if bookmark exists
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Boolean>} True if bookmark exists
   */
  async exists(userId, eventId) {
    const count = await Bookmark.countDocuments({ user: userId, event: eventId });
    return count > 0;
  }

  /**
   * Find all bookmarks by user
   * @param {String} userId - User ID
   * @param {Object} options - Query options (page, limit, sort, populate)
   * @returns {Promise<Object>} Bookmarks and metadata
   */
  async findByUser(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      populate = false,
      tag,
      lean = false
    } = options;

    const skip = (page - 1) * limit;

    // Build query
    const queryFilter = { user: userId };
    if (tag) {
      queryFilter.tags = tag;
    }

    const query = Bookmark.find(queryFilter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate) {
      query.populate('event');
    }

    if (lean) {
      query.lean();
    }

    const [bookmarks, totalCount] = await Promise.all([
      query,
      Bookmark.countDocuments(queryFilter)
    ]);

    return {
      bookmarks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Find upcoming bookmarked events
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Array of bookmarks with upcoming events
   */
  async findUpcomingByUser(userId) {
    return await Bookmark.findUpcomingByUser(userId);
  }

  /**
   * Get bookmark count for an event
   * @param {String} eventId - Event ID
   * @returns {Promise<Number>} Count of bookmarks
   */
  async getEventBookmarkCount(eventId) {
    return await Bookmark.getEventBookmarkCount(eventId);
  }

  /**
   * Get all unique tags for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Array of unique tags
   */
  async getUserTags(userId) {
    return await Bookmark.getUserTags(userId);
  }

  /**
   * Update bookmark
   * @param {String} bookmarkId - Bookmark ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Bookmark|null>} Updated bookmark
   */
  async update(bookmarkId, updateData) {
    return await Bookmark.findByIdAndUpdate(
      bookmarkId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('event');
  }

  /**
   * Delete bookmark by ID
   * @param {String} bookmarkId - Bookmark ID
   * @returns {Promise<Bookmark|null>} Deleted bookmark
   */
  async delete(bookmarkId) {
    return await Bookmark.findByIdAndDelete(bookmarkId);
  }

  /**
   * Delete bookmark by user and event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByUserAndEvent(userId, eventId) {
    return await Bookmark.deleteOne({ user: userId, event: eventId });
  }

  /**
   * Toggle bookmark (create if doesn't exist, delete if exists)
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} { bookmarked: boolean, bookmark: Bookmark|null }
   */
  async toggleBookmark(userId, eventId) {
    const existingBookmark = await this.findByUserAndEvent(userId, eventId);
    
    if (existingBookmark) {
      await this.delete(existingBookmark._id);
      return { bookmarked: false, bookmark: null };
    } else {
      const bookmark = await this.create({ user: userId, event: eventId });
      return { bookmarked: true, bookmark };
    }
  }

  /**
   * Count bookmarks by user
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Count
   */
  async countByUser(userId) {
    return await Bookmark.countDocuments({ user: userId });
  }
}

module.exports = new BookmarkRepository();

