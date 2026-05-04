/**
 * Comment Routes
 * Handles all comment-related endpoints
 */

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateCreateComment,
  validateUpdateComment,
  validateFlagComment,
  validateGetEventComments,
  validateGetFlaggedComments,
  validateCommentId
} = require('../middleware/commentValidation');

// ============================================================================
// Comment Management Routes
// ============================================================================

/**
 * POST /api/v1/events/:id/comments
 * Create a comment on an event
 * Access: Authenticated users who attended the event
 */
router.post(
  '/events/:id/comments',
  authenticate,
  validateCreateComment,
  commentController.createComment
);

/**
 * GET /api/v1/events/:id/comments
 * Get all comments for an event with pagination and sorting
 * Access: Public
 */
router.get(
  '/events/:id/comments',
  validateGetEventComments,
  commentController.getEventComments
);

/**
 * GET /api/v1/events/:id/comments/stats
 * Get comment statistics for an event
 * Access: Public
 */
router.get(
  '/events/:id/comments/stats',
  validateCommentId,
  commentController.getCommentStats
);

/**
 * PUT /api/v1/comments/:id
 * Update a comment
 * Access: Comment author only
 */
router.put(
  '/comments/:id',
  authenticate,
  validateUpdateComment,
  commentController.updateComment
);

/**
 * DELETE /api/v1/comments/:id
 * Delete a comment
 * Access: Comment author or moderator/admin
 */
router.delete(
  '/comments/:id',
  authenticate,
  validateCommentId,
  commentController.deleteComment
);

// ============================================================================
// Comment Moderation Routes
// ============================================================================

/**
 * POST /api/v1/comments/:id/flag
 * Flag a comment as inappropriate
 * Access: Authenticated users (except comment author)
 */
router.post(
  '/comments/:id/flag',
  authenticate,
  validateFlagComment,
  commentController.flagComment
);

/**
 * POST /api/v1/comments/:id/unflag
 * Unflag a comment (remove flag)
 * Access: Moderators and admins only
 */
router.post(
  '/comments/:id/unflag',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validateCommentId,
  commentController.unflagComment
);

/**
 * GET /api/v1/comments/flagged
 * Get all flagged comments for moderation
 * Access: Moderators and admins only
 */
router.get(
  '/comments/flagged',
  authenticate,
  authorize('ADMIN', 'MODERATOR'),
  validateGetFlaggedComments,
  commentController.getFlaggedComments
);

module.exports = router;

