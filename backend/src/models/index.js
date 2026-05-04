/**
 * Models Index
 * Central export point for all Mongoose models and schemas
 */

const { Event, EventStatus } = require('./Event');
const { EventRegistration, RegistrationStatus } = require('./EventRegistration');
const { Comment } = require('./Comment');
const { Like } = require('./Like');
const { Bookmark } = require('./Bookmark');
const { Notification, NotificationType, NotificationStatus } = require('./Notification');
const { NotificationPreferencesSchema } = require('./NotificationPreferences');
const { CalendarSync, CalendarProvider, SyncStatus } = require('./CalendarSync');
const { RecommendationFeedback } = require('./RecommendationFeedback');

module.exports = {
  // Models
  Event,
  EventRegistration,
  Comment,
  Like,
  Bookmark,
  Notification,
  CalendarSync,
  RecommendationFeedback,
  
  // Schemas (for embedding)
  NotificationPreferencesSchema,
  
  // Enums
  EventStatus,
  RegistrationStatus,
  NotificationType,
  NotificationStatus,
  CalendarProvider,
  SyncStatus
};

