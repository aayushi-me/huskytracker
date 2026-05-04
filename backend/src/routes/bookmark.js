/**
 * Bookmark Routes
 * Defines all routes for bookmark operations
 */

const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { authenticate } = require('../middleware/auth');

// Toggle bookmark (create/delete) - requires auth
router.post('/:eventId/toggle', authenticate, bookmarkController.toggleBookmark);

// Get user's bookmarks - requires auth
router.get('/', authenticate, bookmarkController.getMyBookmarks);

// Check if user has bookmarked an event - requires auth
router.get('/:eventId/check', authenticate, bookmarkController.checkBookmark);

// Get bookmark count for an event (public - no auth required)
router.get('/:eventId/count', bookmarkController.getBookmarkCount);

// Update bookmark (tags, notes) - requires auth
router.put('/:bookmarkId', authenticate, bookmarkController.updateBookmark);

// Delete bookmark - requires auth
router.delete('/:bookmarkId', authenticate, bookmarkController.deleteBookmark);

// Get user's bookmark tags - requires auth
router.get('/tags/all', authenticate, bookmarkController.getMyTags);

// Get upcoming bookmarked events - requires auth
router.get('/upcoming/all', authenticate, bookmarkController.getUpcomingBookmarks);

module.exports = router;

