/**
 * Bookmark Service
 * Contains business logic for bookmark management
 * Handles validation, authorization, and coordinates with repository
 */

const bookmarkRepository = require('../repositories/bookmarkRepository');
const { Event } = require('../models/Event');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

class BookmarkService {
  /**
   * Toggle bookmark (create if doesn't exist, delete if exists)
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} { bookmarked: boolean, bookmark: Bookmark|null, bookmarkCount: number }
   */
  async toggleBookmark(userId, eventId) {
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Toggle bookmark
    const result = await bookmarkRepository.toggleBookmark(userId, eventId);

    // Get updated bookmark count
    const bookmarkCount = await bookmarkRepository.getEventBookmarkCount(eventId);

    return {
      ...result,
      bookmarkCount
    };
  }

  /**
   * Get user's bookmarks
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Bookmarks and pagination metadata
   */
  async getUserBookmarks(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      tag,
      search
    } = options;

    // Get bookmarks from repository
    const result = await bookmarkRepository.findByUser(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      tag,
      populate: true
    });

    // Filter by search if provided (client-side filtering for now)
    let filteredBookmarks = result.bookmarks;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredBookmarks = result.bookmarks.filter(bookmark => {
        if (!bookmark.event) return false;
        return (
          bookmark.event.title?.toLowerCase().includes(searchLower) ||
          bookmark.event.description?.toLowerCase().includes(searchLower) ||
          bookmark.event.category?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filter out bookmarks with null events (events that were deleted)
    filteredBookmarks = filteredBookmarks.filter(b => b.event !== null);

    return {
      bookmarks: filteredBookmarks,
      pagination: result.pagination
    };
  }

  /**
   * Check if user has bookmarked an event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} { bookmarked: boolean, bookmark: Bookmark|null, bookmarkCount: number }
   */
  async checkBookmark(userId, eventId) {
    const bookmark = await bookmarkRepository.findByUserAndEvent(userId, eventId, {
      populate: ['event']
    });
    const bookmarkCount = await bookmarkRepository.getEventBookmarkCount(eventId);

    return {
      bookmarked: !!bookmark,
      bookmark: bookmark || null,
      bookmarkCount
    };
  }

  /**
   * Get bookmark count for an event (public)
   * @param {String} eventId - Event ID
   * @returns {Promise<Number>} Bookmark count
   */
  async getBookmarkCount(eventId) {
    return await bookmarkRepository.getEventBookmarkCount(eventId);
  }

  /**
   * Update bookmark (tags, notes)
   * @param {String} bookmarkId - Bookmark ID
   * @param {String} userId - User ID making the request
   * @param {Object} updateData - Data to update
   * @returns {Promise<Bookmark>} Updated bookmark
   */
  async updateBookmark(bookmarkId, userId, updateData) {
    const bookmark = await bookmarkRepository.findById(bookmarkId);

    if (!bookmark) {
      throw new NotFoundError('Bookmark not found');
    }

    // Verify user owns the bookmark
    if (bookmark.user.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to update this bookmark');
    }

    // Validate tags if provided
    if (updateData.tags !== undefined) {
      if (Array.isArray(updateData.tags)) {
        updateData.tags = updateData.tags.filter(tag => tag && tag.trim().length > 0);
      } else {
        throw new ValidationError('Tags must be an array');
      }
    }

    return await bookmarkRepository.update(bookmarkId, updateData);
  }

  /**
   * Delete bookmark
   * @param {String} bookmarkId - Bookmark ID
   * @param {String} userId - User ID making the request
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBookmark(bookmarkId, userId) {
    const bookmark = await bookmarkRepository.findById(bookmarkId);

    if (!bookmark) {
      throw new NotFoundError('Bookmark not found');
    }

    // Verify user owns the bookmark
    if (bookmark.user.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to delete this bookmark');
    }

    await bookmarkRepository.delete(bookmarkId);

    return { deleted: true };
  }

  /**
   * Get user's bookmark tags
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Array of unique tags
   */
  async getUserTags(userId) {
    const tags = await bookmarkRepository.getUserTags(userId);
    return tags.filter(tag => tag); // Filter out null/empty tags
  }

  /**
   * Get upcoming bookmarked events
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Array of bookmarks with upcoming events
   */
  async getUpcomingBookmarks(userId) {
    const bookmarks = await bookmarkRepository.findUpcomingByUser(userId);
    // Filter out null events
    return bookmarks.filter(b => b.event !== null);
  }
}

module.exports = new BookmarkService();

