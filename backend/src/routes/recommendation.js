/**
 * Recommendation Routes
 * Routes for recommendation feedback (dismiss, interested)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { dismissRecommendation, markInterested } = require('../controllers/recommendationController');

/**
 * POST /api/v1/recommendations/:eventId/dismiss
 * Dismiss a recommendation
 * Requires authentication
 */
router.post('/:eventId/dismiss', authenticate, dismissRecommendation);

/**
 * POST /api/v1/recommendations/:eventId/interested
 * Mark recommendation as interested (also bookmarks the event)
 * Requires authentication
 */
router.post('/:eventId/interested', authenticate, markInterested);

module.exports = router;


