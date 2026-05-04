/**
 * Comment Controller
 * Handles HTTP requests for comment operations
 */

const commentService = require('../services/commentService');
const { asyncHandler } = require('../utils/errors');

/**
 * Create a new comment on an event
 * POST /api/v1/events/:id/comments
 * Access: Authenticated users who attended the event
 */
const createComment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.id;
  const { content, rating } = req.body;

  const comment = await commentService.createComment(userId, eventId, {
    content,
    rating
  });

  res.status(201).json({
    success: true,
    message: 'Comment created successfully',
    data: { comment }
  });
});

/**
 * Get comments for an event
 * GET /api/v1/events/:id/comments
 * Access: Public
 */
const getEventComments = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const { page, limit, sort } = req.query;

  const result = await commentService.getEventComments(eventId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    sort: sort || 'newest'
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Update a comment
 * PUT /api/v1/comments/:id
 * Access: Comment author only
 */
const updateComment = asyncHandler(async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const { content, rating } = req.body;

  const comment = await commentService.updateComment(commentId, userId, {
    content,
    rating
  });

  res.status(200).json({
    success: true,
    message: 'Comment updated successfully',
    data: { comment }
  });
});

/**
 * Delete a comment
 * DELETE /api/v1/comments/:id
 * Access: Comment author or moderator/admin
 */
const deleteComment = asyncHandler(async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  await commentService.deleteComment(commentId, userId, userRole);

  res.status(204).send();
});

/**
 * Flag a comment as inappropriate
 * POST /api/v1/comments/:id/flag
 * Access: Authenticated users (except comment author)
 */
const flagComment = asyncHandler(async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const { reason } = req.body;

  const comment = await commentService.flagComment(commentId, userId, reason);

  res.status(200).json({
    success: true,
    message: 'Comment flagged successfully',
    data: { comment }
  });
});

/**
 * Unflag a comment (moderator action)
 * POST /api/v1/comments/:id/unflag
 * Access: Moderators and admins only
 */
const unflagComment = asyncHandler(async (req, res) => {
  const commentId = req.params.id;
  const userRole = req.user.role;

  const comment = await commentService.unflagComment(commentId, userRole);

  res.status(200).json({
    success: true,
    message: 'Comment unflagged successfully',
    data: { comment }
  });
});

/**
 * Get all flagged comments
 * GET /api/v1/comments/flagged
 * Access: Moderators and admins only
 */
const getFlaggedComments = asyncHandler(async (req, res) => {
  const userRole = req.user.role;
  const { page, limit } = req.query;

  const result = await commentService.getFlaggedComments(userRole, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Get comment statistics for an event
 * GET /api/v1/events/:id/comments/stats
 * Access: Public
 */
const getCommentStats = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const stats = await commentService.getCommentStats(eventId);

  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  createComment,
  getEventComments,
  updateComment,
  deleteComment,
  flagComment,
  unflagComment,
  getFlaggedComments,
  getCommentStats
};

