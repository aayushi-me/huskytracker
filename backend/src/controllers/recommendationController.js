/**
 * Recommendation Controller
 * Handles recommendation feedback (dismiss, interested)
 */

const { RecommendationFeedback } = require('../models/RecommendationFeedback');
const { Bookmark } = require('../models/Bookmark');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Dismiss a recommendation
 * POST /api/v1/recommendations/:eventId/dismiss
 */
async function dismissRecommendation(req, res, next) {
  try {
    const userId = req.user._id;
    const { eventId } = req.params;

    if (!eventId) {
      throw new ValidationError('Event ID is required');
    }

    await RecommendationFeedback.dismissRecommendation(userId, eventId);

    res.status(200).json({
      success: true,
      message: 'Recommendation dismissed'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark recommendation as interested
 * POST /api/v1/recommendations/:eventId/interested
 * Also bookmarks the event if not already bookmarked
 */
async function markInterested(req, res, next) {
  try {
    const userId = req.user._id;
    const { eventId } = req.params;

    if (!eventId) {
      throw new ValidationError('Event ID is required');
    }

    // Mark as interested in recommendation feedback
    await RecommendationFeedback.markInterested(userId, eventId);

    // Also bookmark the event if not already bookmarked
    try {
      const existingBookmark = await Bookmark.findOne({ user: userId, event: eventId });
      if (!existingBookmark) {
        await Bookmark.create({ user: userId, event: eventId });
      }
    } catch (bookmarkError) {
      // If bookmarking fails, still return success for the interested action
      // (bookmark might already exist or other non-critical error)
      console.warn('Failed to bookmark event when marking as interested:', bookmarkError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Marked as interested and bookmarked'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  dismissRecommendation,
  markInterested
};

