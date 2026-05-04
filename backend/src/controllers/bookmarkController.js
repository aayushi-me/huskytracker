/**
 * Bookmark Controller
 * Handles HTTP requests for bookmark operations
 */

const bookmarkService = require('../services/bookmarkService');
const { asyncHandler } = require('../utils/errors');

/**
 * Toggle bookmark (create if doesn't exist, delete if exists)
 * POST /api/v1/bookmarks/:eventId/toggle
 * Access: Authenticated
 */
const toggleBookmark = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  const result = await bookmarkService.toggleBookmark(userId, eventId);

  res.status(200).json({
    success: true,
    message: result.bookmarked ? 'Event bookmarked successfully' : 'Bookmark removed successfully',
    data: {
      bookmarked: result.bookmarked,
      bookmark: result.bookmark,
      bookmarkCount: result.bookmarkCount
    }
  });
});

/**
 * Get user's bookmarks
 * GET /api/v1/bookmarks
 * Access: Authenticated
 */
const getMyBookmarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    page = 1,
    limit = 20,
    tag,
    search
  } = req.query;

  const result = await bookmarkService.getUserBookmarks(userId, {
    page,
    limit,
    tag,
    search
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Check if user has bookmarked an event
 * GET /api/v1/bookmarks/:eventId/check
 * Access: Authenticated
 */
const checkBookmark = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  const result = await bookmarkService.checkBookmark(userId, eventId);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Get bookmark count for an event
 * GET /api/v1/bookmarks/:eventId/count
 * Access: Public
 */
const getBookmarkCount = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const bookmarkCount = await bookmarkService.getBookmarkCount(eventId);

  res.status(200).json({
    success: true,
    data: {
      bookmarkCount
    }
  });
});

/**
 * Update bookmark (add tags, notes)
 * PUT /api/v1/bookmarks/:bookmarkId
 * Access: Authenticated
 */
const updateBookmark = asyncHandler(async (req, res) => {
  const { bookmarkId } = req.params;
  const userId = req.user.id;
  const { tags, notes } = req.body;

  const bookmark = await bookmarkService.updateBookmark(bookmarkId, userId, { tags, notes });

  res.status(200).json({
    success: true,
    message: 'Bookmark updated successfully',
    data: { bookmark }
  });
});

/**
 * Delete bookmark
 * DELETE /api/v1/bookmarks/:bookmarkId
 * Access: Authenticated
 */
const deleteBookmark = asyncHandler(async (req, res) => {
  const { bookmarkId } = req.params;
  const userId = req.user.id;

  await bookmarkService.deleteBookmark(bookmarkId, userId);

  res.status(200).json({
    success: true,
    message: 'Bookmark deleted successfully'
  });
});

/**
 * Get user's bookmark tags
 * GET /api/v1/bookmarks/tags
 * Access: Authenticated
 */
const getMyTags = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const tags = await bookmarkService.getUserTags(userId);

  res.status(200).json({
    success: true,
    data: {
      tags
    }
  });
});

/**
 * Get upcoming bookmarked events
 * GET /api/v1/bookmarks/upcoming
 * Access: Authenticated
 */
const getUpcomingBookmarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const bookmarks = await bookmarkService.getUpcomingBookmarks(userId);

  res.status(200).json({
    success: true,
    data: {
      bookmarks
    }
  });
});

module.exports = {
  toggleBookmark,
  getMyBookmarks,
  checkBookmark,
  getBookmarkCount,
  updateBookmark,
  deleteBookmark,
  getMyTags,
  getUpcomingBookmarks
};

