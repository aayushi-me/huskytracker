const mongoose = require('mongoose');

/**
 * RecommendationFeedback Schema
 * Tracks user feedback on recommended events (dismissals and interest)
 */
const RecommendationFeedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required'],
    index: true
  },
  dismissed: {
    type: Boolean,
    default: false,
    index: true
  },
  interested: {
    type: Boolean,
    default: false,
    index: true
  },
  dismissedAt: {
    type: Date,
    default: null
  },
  interestedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: One feedback record per user-event pair
RecommendationFeedbackSchema.index({ user: 1, event: 1 }, { unique: true });

// Index for finding dismissed events
RecommendationFeedbackSchema.index({ user: 1, dismissed: 1 });

/**
 * Find or create feedback for user-event pair
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<RecommendationFeedback>} Feedback document
 */
RecommendationFeedbackSchema.statics.findOrCreate = async function(userId, eventId) {
  let feedback = await this.findOne({ user: userId, event: eventId });
  if (!feedback) {
    feedback = await this.create({ user: userId, event: eventId });
  }
  return feedback;
};

/**
 * Dismiss a recommendation
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<RecommendationFeedback>} Updated feedback document
 */
RecommendationFeedbackSchema.statics.dismissRecommendation = async function(userId, eventId) {
  const feedback = await this.findOrCreate(userId, eventId);
  feedback.dismissed = true;
  feedback.dismissedAt = new Date();
  return feedback.save();
};

/**
 * Mark recommendation as interested
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<RecommendationFeedback>} Updated feedback document
 */
RecommendationFeedbackSchema.statics.markInterested = async function(userId, eventId) {
  const feedback = await this.findOrCreate(userId, eventId);
  feedback.interested = true;
  feedback.interestedAt = new Date();
  return feedback.save();
};

/**
 * Get all dismissed event IDs for a user
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of dismissed event IDs
 */
RecommendationFeedbackSchema.statics.getDismissedEventIds = async function(userId) {
  const dismissed = await this.find({ user: userId, dismissed: true }).lean();
  return dismissed.map(f => f.event.toString());
};

const RecommendationFeedback = mongoose.model('RecommendationFeedback', RecommendationFeedbackSchema);

module.exports = { RecommendationFeedback };


