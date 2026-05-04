/**
 * Notification Service
 * Contains business logic for notification management
 * Handles notification creation, scheduling, email delivery, and preferences
 */

const notificationRepository = require('../repositories/notificationRepository');
const { sendNotificationEmail } = require('../utils/email');
const { NotificationType, NotificationStatus } = require('../models/Notification');
const User = require('../models/User');
const { Event } = require('../models/Event');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');

class NotificationService {
  /**
   * Notification type configuration
   * Maps notification types to their metadata
   */
  static NOTIFICATION_CONFIG = {
    [NotificationType.EVENT_REMINDER]: {
      title: (data) => `Reminder: ${data.eventTitle} is coming up soon!`,
      message: (data) => `Don't forget about "${data.eventTitle}" starting at ${new Date(data.startDate).toLocaleString()}.`,
      emailSubject: (data) => `Reminder: ${data.eventTitle}`,
      preferenceKey: 'eventReminders'
    },
    [NotificationType.REGISTRATION_CONFIRMED]: {
      title: (data) => 'Registration Confirmed',
      message: (data) => `You're registered for "${data.eventTitle}". See you there!`,
      emailSubject: (data) => `Registration Confirmed: ${data.eventTitle}`,
      preferenceKey: 'registrationUpdates'
    },
    [NotificationType.REGISTRATION_WAITLISTED]: {
      title: (data) => 'Added to Waitlist',
      message: (data) => `You've been added to the waitlist for "${data.eventTitle}". We'll notify you if a spot opens up.`,
      emailSubject: (data) => `Waitlist: ${data.eventTitle}`,
      preferenceKey: 'registrationUpdates'
    },
    [NotificationType.REGISTRATION_APPROVED]: {
      title: (data) => 'Registration Approved!',
      message: (data) => `Great news! You've been approved for "${data.eventTitle}".`,
      emailSubject: (data) => `Approved: ${data.eventTitle}`,
      preferenceKey: 'registrationUpdates'
    },
    [NotificationType.EVENT_UPDATED]: {
      title: (data) => 'Event Updated',
      message: (data) => `"${data.eventTitle}" has been updated. Check the event details for changes.`,
      emailSubject: (data) => `Event Updated: ${data.eventTitle}`,
      preferenceKey: 'eventUpdates'
    },
    [NotificationType.EVENT_CANCELLED]: {
      title: (data) => 'Event Cancelled',
      message: (data) => `Unfortunately, "${data.eventTitle}" has been cancelled.`,
      emailSubject: (data) => `Event Cancelled: ${data.eventTitle}`,
      preferenceKey: 'eventUpdates'
    },
    [NotificationType.NEW_COMMENT]: {
      title: (data) => 'New Comment on Your Event',
      message: (data) => `${data.commenterName} commented on "${data.eventTitle}": "${data.commentPreview}"`,
      emailSubject: (data) => `New Comment: ${data.eventTitle}`,
      preferenceKey: 'newComments'
    },
    [NotificationType.COMMENT_REPLY]: {
      title: (data) => 'Reply to Your Comment',
      message: (data) => `${data.replierName} replied to your comment on "${data.eventTitle}".`,
      emailSubject: (data) => `Reply: ${data.eventTitle}`,
      preferenceKey: 'commentReplies'
    },
    [NotificationType.EVENT_INVITATION]: {
      title: (data) => 'Event Invitation',
      message: (data) => `You're invited to "${data.eventTitle}".`,
      emailSubject: (data) => `Invitation: ${data.eventTitle}`,
      preferenceKey: 'eventUpdates'
    },
    [NotificationType.SYSTEM_ANNOUNCEMENT]: {
      title: (data) => data.title || 'System Announcement',
      message: (data) => data.message,
      emailSubject: (data) => data.title || 'HuskyTrack Announcement',
      preferenceKey: 'systemAnnouncements'
    }
  };

  /**
   * Create a notification
   * @param {Object} options - Notification options
   * @param {String} options.userId - User ID
   * @param {String} options.type - Notification type
   * @param {String} options.eventId - Event ID (optional)
   * @param {Object} options.data - Additional data for the notification
   * @param {Boolean} options.sendEmail - Whether to send email (default: check preferences)
   * @returns {Promise<Object>} Created notification
   */
  async createNotification({ userId, type, eventId = null, data = {}, sendEmail = null }) {
    // Validate notification type
    if (!NotificationType[type]) {
      throw new ValidationError(`Invalid notification type: ${type}`);
    }

    // Get user with preferences
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get notification configuration
    const config = NotificationService.NOTIFICATION_CONFIG[type];
    if (!config) {
      throw new ValidationError(`No configuration found for notification type: ${type}`);
    }

    // Generate notification content
    const title = typeof config.title === 'function' ? config.title(data) : config.title;
    const message = typeof config.message === 'function' ? config.message(data) : config.message;

    // Create notification document
    const notificationData = {
      user: userId,
      type,
      status: NotificationStatus.UNREAD,
      title,
      message,
      event: eventId,
      comment: data.commentId || null,
      registration: data.registrationId || null,
      actionUrl: data.actionUrl || null,
      metadata: data
    };

    const notification = await notificationRepository.create(notificationData);

    // Check if email should be sent
    const shouldSendEmail = sendEmail !== null 
      ? sendEmail 
      : this.shouldSendEmail(user, type, config.preferenceKey);

    // Send email if enabled
    if (shouldSendEmail && !this.isQuietHours(user)) {
      try {
        const emailSubject = typeof config.emailSubject === 'function' 
          ? config.emailSubject(data) 
          : config.emailSubject;

        await sendNotificationEmail({
          to: user.email,
          userName: user.firstName,
          subject: emailSubject,
          type: type,
          data: data
        });

        console.log(`Notification email sent to ${user.email} for ${type}`);
      } catch (error) {
        console.error(`Failed to send notification email to ${user.email}:`, error.message);
        // Don't throw error - notification was created successfully
      }
    }

    return notification;
  }

  /**
   * Create multiple notifications (bulk)
   * @param {Array} notificationDataArray - Array of notification data
   * @returns {Promise<Array>} Created notifications
   */
  async createBulkNotifications(notificationDataArray) {
    const notifications = [];

    for (const notifData of notificationDataArray) {
      try {
        const notification = await this.createNotification(notifData);
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to create notification for user ${notifData.userId}:`, error.message);
        // Continue with other notifications
      }
    }

    return notifications;
  }

  /**
   * Get user's notifications
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Notifications with pagination
   */
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status = null,
      type = null
    } = options;

    const skip = (page - 1) * limit;

    const notifications = await notificationRepository.findByUser(userId, {
      status,
      type,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const totalCount = await notificationRepository.countByUser(userId, {
      ...(status && { status }),
      ...(type && { type })
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Get unread notification count
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Unread count
   */
  async getUnreadCount(userId) {
    return await notificationRepository.getUnreadCount(userId);
  }

  /**
   * Mark notification as read
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    const notification = await notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Check ownership
    if (notification.user.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to modify this notification');
    }

    return await notificationRepository.markAsRead(notificationId);
  }

  /**
   * Mark all user's notifications as read
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    const result = await notificationRepository.markAllAsRead(userId);
    return {
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} notification(s) marked as read`
    };
  }

  /**
   * Delete notification
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object>} Delete result
   */
  async deleteNotification(notificationId, userId) {
    const notification = await notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Check ownership
    if (notification.user.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to delete this notification');
    }

    await notificationRepository.delete(notificationId);
    return { message: 'Notification deleted successfully' };
  }

  /**
   * Schedule event reminder notifications
   * Called by the notification scheduler job
   * @param {String} eventId - Event ID
   * @returns {Promise<Array>} Created reminder notifications
   */
  async scheduleEventReminders(eventId) {
    const event = await Event.findById(eventId).populate('organizer');
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Get all registered users for this event
    const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
    const registrations = await EventRegistration.find({
      event: eventId,
      status: RegistrationStatus.REGISTERED
    }).populate('user');

    const notifications = [];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    for (const registration of registrations) {
      const user = registration.user;
      
      // Check user's reminder preferences
      const reminderTime = user.notificationPreferences?.reminderTime || 24; // Default 24 hours
      const eventStart = new Date(event.startDate);
      const now = new Date();
      const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);

      // Only send reminder if within the user's preferred reminder window
      if (hoursUntilEvent > 0 && hoursUntilEvent <= reminderTime + 1) {
        try {
          const notification = await this.createNotification({
            userId: user._id,
            type: NotificationType.EVENT_REMINDER,
            eventId: event._id,
            data: {
              eventTitle: event.title,
              startDate: event.startDate,
              location: event.location,
              eventUrl: `${frontendUrl}/events/${event._id}`
            }
          });
          notifications.push(notification);
        } catch (error) {
          console.error(`Failed to create reminder for user ${user._id}:`, error.message);
        }
      }
    }

    return notifications;
  }

  /**
   * Notify all registered users about event update
   * @param {String} eventId - Event ID
   * @param {String} changes - Description of changes
   * @returns {Promise<Array>} Created notifications
   */
  async notifyEventUpdate(eventId, changes = null) {
    const event = await Event.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
    const registrations = await EventRegistration.find({
      event: eventId,
      status: { $in: [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED] }
    }).populate('user');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const notificationData = registrations.map(reg => ({
      userId: reg.user._id,
      type: NotificationType.EVENT_UPDATED,
      eventId: event._id,
      data: {
        eventTitle: event.title,
        changes: changes || 'Event details have been updated.',
        eventUrl: `${frontendUrl}/events/${event._id}`
      }
    }));

    return await this.createBulkNotifications(notificationData);
  }

  /**
   * Notify all registered users about event cancellation
   * @param {String} eventId - Event ID
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Array>} Created notifications
   */
  async notifyEventCancellation(eventId, reason = null) {
    const event = await Event.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
    const registrations = await EventRegistration.find({
      event: eventId,
      status: { $in: [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED] }
    }).populate('user');

    const notificationData = registrations.map(reg => ({
      userId: reg.user._id,
      type: NotificationType.EVENT_CANCELLED,
      eventId: event._id,
      data: {
        eventTitle: event.title,
        reason: reason || 'The organizer has cancelled this event.'
      }
    }));

    return await this.createBulkNotifications(notificationData);
  }

  /**
   * Notify event organizer about new comment
   * @param {String} eventId - Event ID
   * @param {String} commenterId - Commenter user ID
   * @param {String} commentText - Comment text
   * @returns {Promise<Object>} Created notification
   */
  async notifyNewComment(eventId, commenterId, commentText) {
    const event = await Event.findById(eventId).populate('organizer');
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const commenter = await User.findById(commenterId);
    if (!commenter) {
      throw new NotFoundError('Commenter not found');
    }

    // Don't notify if organizer commented on their own event
    if (event.organizer._id.toString() === commenterId.toString()) {
      return null;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const commentPreview = commentText.length > 100 
      ? commentText.substring(0, 100) + '...' 
      : commentText;

    return await this.createNotification({
      userId: event.organizer._id,
      type: NotificationType.NEW_COMMENT,
      eventId: event._id,
      data: {
        eventTitle: event.title,
        commenterName: `${commenter.firstName} ${commenter.lastName}`,
        commentPreview,
        eventUrl: `${frontendUrl}/events/${event._id}`
      }
    });
  }

  /**
   * Check if email should be sent based on user preferences
   * @param {Object} user - User document with preferences
   * @param {String} notificationType - Notification type
   * @param {String} preferenceKey - Preference key to check
   * @returns {Boolean} Whether email should be sent
   */
  shouldSendEmail(user, notificationType, preferenceKey) {
    if (!user.notificationPreferences) {
      return true; // Default to sending emails if no preferences set
    }

    const emailPrefs = user.notificationPreferences.email;
    if (!emailPrefs) {
      return true;
    }

    // Check if email notifications are enabled for this type
    return emailPrefs[preferenceKey] !== false;
  }

  /**
   * Check if current time is within user's quiet hours
   * @param {Object} user - User document with preferences
   * @returns {Boolean} True if in quiet hours
   */
  isQuietHours(user) {
    if (!user.notificationPreferences?.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const start = user.notificationPreferences.quietHours.start;
    const end = user.notificationPreferences.quietHours.end;

    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }
}

// Export wrapper functions for backward compatibility
const sendWelcomeEmail = async ({ to, userName }) => {
  const emailModule = require('../utils/email');
  return await emailModule.sendWelcomeEmail({ to, userName });
};

const sendPasswordResetEmail = async ({ to, resetToken, userName }) => {
  const emailModule = require('../utils/email');
  return await emailModule.sendPasswordResetEmail({ to, resetToken, userName });
};

const sendPasswordChangedEmail = async ({ to, userName }) => {
  const emailModule = require('../utils/email');
  return await emailModule.sendPasswordChangedEmail({ to, userName });
};

const sendEventCancellationEmail = async ({ to, userName, eventName, eventDate, eventLocation, eventUrl, unsubscribeUrl }) => {
  const emailModule = require('../utils/email');
  return await emailModule.sendNotificationEmail({
    to,
    userName,
    subject: `Event Cancelled: ${eventName}`,
    type: 'EVENT_CANCELLED',
    data: {
      eventTitle: eventName,
      reason: 'The organizer has cancelled this event.'
    }
  });
};

const sendEventUpdateEmail = async ({ to, userName, eventName, changes, eventUrl }) => {
  const emailModule = require('../utils/email');
  return await emailModule.sendNotificationEmail({
    to,
    userName,
    subject: `Event Updated: ${eventName}`,
    type: 'EVENT_UPDATED',
    data: {
      eventTitle: eventName,
      changes,
      eventUrl
    }
  });
};

const sendEventReminderEmail = async ({ to, userName, eventName, eventDate, eventLocation, eventUrl }) => {
  const emailModule = require('../utils/email');
  return await emailModule.sendNotificationEmail({
    to,
    userName,
    subject: `Reminder: ${eventName}`,
    type: 'EVENT_REMINDER',
    data: {
      eventTitle: eventName,
      startDate: eventDate,
      location: { name: eventLocation },
      eventUrl
    }
  });
};

const sendRegistrationConfirmationEmail = async ({ to, userName, eventName, eventDate, eventLocation, eventUrl }) => {
  const emailModule = require('../utils/email');
  return await emailModule.sendNotificationEmail({
    to,
    userName,
    subject: `Registration Confirmed: ${eventName}`,
    type: 'REGISTRATION_CONFIRMED',
    data: {
      eventTitle: eventName,
      startDate: eventDate,
      location: { name: eventLocation },
      eventUrl
    }
  });
};

module.exports = new NotificationService();

// Export wrapper functions
module.exports.sendWelcomeEmail = sendWelcomeEmail;
module.exports.sendPasswordResetEmail = sendPasswordResetEmail;
module.exports.sendPasswordChangedEmail = sendPasswordChangedEmail;
module.exports.sendEventCancellationEmail = sendEventCancellationEmail;
module.exports.sendEventUpdateEmail = sendEventUpdateEmail;
module.exports.sendEventReminderEmail = sendEventReminderEmail;
module.exports.sendRegistrationConfirmationEmail = sendRegistrationConfirmationEmail;



