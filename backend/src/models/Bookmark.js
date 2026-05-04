const mongoose = require('mongoose');

/**
 * Bookmark Schema
 * Represents a user's bookmark/save of an event
 */
const BookmarkSchema = new mongoose.Schema({
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
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: A user can only bookmark an event once
BookmarkSchema.index({ user: 1, event: 1 }, { unique: true });

// Indexes for frequent queries
BookmarkSchema.index({ user: 1, createdAt: -1 }); // For user's bookmarks
BookmarkSchema.index({ event: 1 }); // For event bookmark count
BookmarkSchema.index({ user: 1, tags: 1 }); // For tag-based filtering

/**
 * Model Methods
 */

/**
 * Find user's bookmarks
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of bookmarks
 */
BookmarkSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ user: userId })
    .populate('event')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find user's bookmarks by tag
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {String} tag - Tag to filter by
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of bookmarks with the tag
 */
BookmarkSchema.statics.findByUserAndTag = function(userId, tag, options = {}) {
  return this.find({ user: userId, tags: tag })
    .populate('event')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find user's upcoming bookmarked events
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of upcoming bookmarked events
 */
BookmarkSchema.statics.findUpcomingByUser = function(userId) {
  return this.find({ user: userId })
    .populate({
      path: 'event',
      match: { 
        startDate: { $gt: new Date() },
        status: 'PUBLISHED'
      }
    })
    .sort({ 'event.startDate': 1 });
};

/**
 * Check if user has bookmarked an event
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Bookmark|null>} Bookmark document or null
 */
BookmarkSchema.statics.findUserBookmark = function(userId, eventId) {
  return this.findOne({ user: userId, event: eventId });
};

/**
 * Get bookmark count for an event
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Number>} Count of bookmarks
 */
BookmarkSchema.statics.getEventBookmarkCount = function(eventId) {
  return this.countDocuments({ event: eventId });
};

/**
 * Get all unique tags for a user
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of unique tags
 */
BookmarkSchema.statics.getUserTags = function(userId) {
  return this.distinct('tags', { user: userId });
};

/**
 * Add a tag to the bookmark
 * @param {String} tag - Tag to add
 * @returns {Promise<Bookmark>} Updated bookmark document
 */
BookmarkSchema.methods.addTag = function(tag) {
  if (tag && !this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

/**
 * Remove a tag from the bookmark
 * @param {String} tag - Tag to remove
 * @returns {Promise<Bookmark>} Updated bookmark document
 */
BookmarkSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

/**
 * Toggle bookmark (create if doesn't exist, delete if exists)
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Object>} { bookmarked: boolean, bookmark: Bookmark|null }
 */
BookmarkSchema.statics.toggleBookmark = async function(userId, eventId) {
  const existingBookmark = await this.findOne({ user: userId, event: eventId });
  
  if (existingBookmark) {
    await this.deleteOne({ _id: existingBookmark._id });
    return { bookmarked: false, bookmark: null };
  } else {
    const bookmark = await this.create({ user: userId, event: eventId });
    return { bookmarked: true, bookmark };
  }
};

const Bookmark = mongoose.model('Bookmark', BookmarkSchema);

module.exports = { Bookmark };

