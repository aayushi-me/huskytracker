/**
 * Like Controller
 * Handles HTTP requests for like operations
 */

const likeService = require('../services/likeService');
const { asyncHandler } = require('../utils/errors');

/**
 * Toggle like (create if doesn't exist, delete if exists)
 * POST /api/v1/events/:eventId/like
 * Access: Authenticated, must have attended event
 */
const toggleLike = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  const result = await likeService.toggleLike(userId, eventId);

  res.status(200).json({
    success: true,
    message: result.liked ? 'Event liked successfully' : 'Like removed successfully',
    data: {
      liked: result.liked,
      like: result.like,
      likeCount: result.likeCount
    }
  });
});

/**
 * Check if user has liked an event
 * GET /api/v1/events/:eventId/like/check
 * Access: Authenticated
 */
const checkLike = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  const result = await likeService.checkLike(userId, eventId);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Get like count for an event
 * GET /api/v1/events/:eventId/likes/count
 * Access: Public
 */
const getLikeCount = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const likeCount = await likeService.getLikeCount(eventId);

  res.status(200).json({
    success: true,
    data: {
      likeCount
    }
  });
});

/**
 * Get likes for an event
 * GET /api/v1/events/:eventId/likes
 * Access: Public
 */
const getEventLikes = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const {
    page = 1,
    limit = 50
  } = req.query;

  const likes = await likeService.getEventLikes(eventId, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.status(200).json({
    success: true,
    data: {
      likes
    }
  });
});

/**
 * Delete a specific like
 * DELETE /api/v1/likes/:likeId
 * Access: Authenticated, must own the like
 */
const deleteLike = asyncHandler(async (req, res) => {
  const { likeId } = req.params;
  const userId = req.user.id;

  await likeService.deleteLike(likeId, userId);

  res.status(200).json({
    success: true,
    message: 'Like removed successfully'
  });
});

module.exports = {
  toggleLike,
  checkLike,
  getLikeCount,
  getEventLikes,
  deleteLike
};

