const mongoose = require('mongoose');

/**
 * NotificationPreferences Schema
 * Embedded schema for user notification preferences
 * This schema should be embedded in the User model
 */
const NotificationPreferencesSchema = new mongoose.Schema({
  email: {
    eventReminders: {
      type: Boolean,
      default: true
    },
    eventUpdates: {
      type: Boolean,
      default: true
    },
    newComments: {
      type: Boolean,
      default: true
    },
    commentReplies: {
      type: Boolean,
      default: true
    },
    registrationUpdates: {
      type: Boolean,
      default: true
    },
    systemAnnouncements: {
      type: Boolean,
      default: true
    }
  },
  push: {
    eventReminders: {
      type: Boolean,
      default: true
    },
    eventUpdates: {
      type: Boolean,
      default: true
    },
    newComments: {
      type: Boolean,
      default: true
    },
    commentReplies: {
      type: Boolean,
      default: true
    },
    registrationUpdates: {
      type: Boolean,
      default: true
    },
    systemAnnouncements: {
      type: Boolean,
      default: true
    }
  },
  inApp: {
    eventReminders: {
      type: Boolean,
      default: true
    },
    eventUpdates: {
      type: Boolean,
      default: true
    },
    newComments: {
      type: Boolean,
      default: true
    },
    commentReplies: {
      type: Boolean,
      default: true
    },
    registrationUpdates: {
      type: Boolean,
      default: true
    },
    systemAnnouncements: {
      type: Boolean,
      default: true
    }
  },
  reminderTime: {
    type: Number,
    default: 24, // Hours before event
    min: [0, 'Reminder time cannot be negative'],
    max: [168, 'Reminder time cannot exceed 168 hours (7 days)']
  },
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00', // 10 PM
      validate: {
        validator: function(v) {
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    end: {
      type: String,
      default: '08:00', // 8 AM
      validate: {
        validator: function(v) {
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'End time must be in HH:MM format'
      }
    }
  }
}, { _id: false });

/**
 * Helper method to check if a notification type is enabled for a channel
 * @param {String} channel - 'email', 'push', or 'inApp'
 * @param {String} notificationType - Type of notification (e.g., 'EVENT_REMINDER')
 * @returns {Boolean} True if notification is enabled
 */
NotificationPreferencesSchema.methods.isEnabled = function(channel, notificationType) {
  const typeMap = {
    'EVENT_REMINDER': 'eventReminders',
    'EVENT_CANCELLED': 'eventUpdates',
    'EVENT_UPDATED': 'eventUpdates',
    'NEW_COMMENT': 'newComments',
    'COMMENT_REPLY': 'commentReplies',
    'REGISTRATION_CONFIRMED': 'registrationUpdates',
    'REGISTRATION_WAITLISTED': 'registrationUpdates',
    'REGISTRATION_APPROVED': 'registrationUpdates',
    'EVENT_INVITATION': 'eventUpdates',
    'SYSTEM_ANNOUNCEMENT': 'systemAnnouncements'
  };

  const preferenceKey = typeMap[notificationType];
  if (!preferenceKey) {
    return false; // Unknown notification type
  }

  return this[channel] && this[channel][preferenceKey] === true;
};

/**
 * Helper method to check if current time is within quiet hours
 * @returns {Boolean} True if currently in quiet hours
 */
NotificationPreferencesSchema.methods.isQuietHours = function() {
  if (!this.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const start = this.quietHours.start;
  const end = this.quietHours.end;

  // Handle quiet hours that span midnight
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  } else {
    return currentTime >= start && currentTime <= end;
  }
};

module.exports = { NotificationPreferencesSchema };

