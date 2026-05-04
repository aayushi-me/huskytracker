/**
 * Notification Scheduler
 * Scheduled job to send event reminder notifications
 * Runs periodically to check for upcoming events and send reminders
 */

const cron = require('node-cron');
const { Event, EventStatus } = require('../models/Event');
const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
const notificationService = require('../services/notificationService');
const { NotificationType } = require('../models/Notification');

class NotificationScheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
    this.lastRunTime = null;
    this.processedReminders = new Set(); // Track sent reminders to avoid duplicates
  }

  /**
   * Start the notification scheduler
   * Runs every 15 minutes to check for events that need reminders
   */
  start() {
    if (this.job) {
      console.log('Notification scheduler already running');
      return;
    }

    // Run every 15 minutes: */15 * * * *
    // For testing, you can use '* * * * *' (every minute)
    const cronSchedule = process.env.NOTIFICATION_CRON_SCHEDULE || '*/15 * * * *';

    this.job = cron.schedule(cronSchedule, async () => {
      await this.processEventReminders();
    });

    console.log(`Notification scheduler started (schedule: ${cronSchedule})`);
    
    // Run immediately on start
    this.processEventReminders();
  }

  /**
   * Stop the notification scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('Notification scheduler stopped');
    }
  }

  /**
   * Process event reminders
   * Finds upcoming events and sends reminders based on user preferences
   */
  async processEventReminders() {
    if (this.isRunning) {
      console.log('Notification scheduler: Previous run still in progress, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();

    try {
      console.log(`\n[${this.lastRunTime.toISOString()}] Notification Scheduler: Starting event reminder processing...`);

      // Find events starting in the next 48 hours
      const now = new Date();
      const lookAheadTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours ahead

      const upcomingEvents = await Event.find({
        status: EventStatus.PUBLISHED,
        startDate: {
          $gte: now,
          $lte: lookAheadTime
        }
      }).lean();

      console.log(`Found ${upcomingEvents.length} upcoming event(s) in the next 48 hours`);

      let remindersProcessed = 0;
      let remindersSent = 0;

      for (const event of upcomingEvents) {
        try {
          const sent = await this.processEventReminderForEvent(event);
          remindersProcessed++;
          remindersSent += sent;
        } catch (error) {
          console.error(`Error processing reminders for event ${event._id}:`, error.message);
        }
      }

      console.log(`Notification Scheduler: Processed ${remindersProcessed} event(s), sent ${remindersSent} reminder(s)`);

      // Clean up old reminder tracking (older than 7 days)
      this.cleanupReminderTracking();

    } catch (error) {
      console.error('Notification Scheduler: Error processing reminders:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process reminders for a specific event
   * @param {Object} event - Event document
   * @returns {Promise<Number>} Number of reminders sent
   */
  async processEventReminderForEvent(event) {
    const now = new Date();
    const eventStart = new Date(event.startDate);
    const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);

    // Find all registered users for this event
    const registrations = await EventRegistration.find({
      event: event._id,
      status: RegistrationStatus.REGISTERED
    }).populate('user');

    let remindersSent = 0;

    for (const registration of registrations) {
      const user = registration.user;
      
      if (!user) continue;

      // Get user's reminder preference (in hours)
      const reminderTime = user.notificationPreferences?.reminderTime || 24; // Default 24 hours

      // Check if we should send reminder now
      // Send if: hoursUntilEvent <= reminderTime and > (reminderTime - 1)
      // This gives a 1-hour window to send the reminder
      const shouldSendReminder = 
        hoursUntilEvent > 0 && 
        hoursUntilEvent <= reminderTime && 
        hoursUntilEvent > (reminderTime - 1);

      // Create unique key to track this reminder
      const reminderKey = `${event._id}_${user._id}_${reminderTime}`;

      if (shouldSendReminder && !this.processedReminders.has(reminderKey)) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          
          await notificationService.createNotification({
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

          this.processedReminders.add(reminderKey);
          remindersSent++;
          
          console.log(`Sent reminder to ${user.email} for event "${event.title}" (${hoursUntilEvent.toFixed(1)} hours before)`);
        } catch (error) {
          console.error(`Failed to send reminder to user ${user._id}:`, error.message);
        }
      }
    }

    return remindersSent;
  }

  /**
   * Clean up old reminder tracking to prevent memory issues
   * Removes reminders older than 7 days
   */
  cleanupReminderTracking() {
    // Since we can't track timestamps in a Set, we'll just clear it periodically
    // In a production environment, you'd want to use Redis or a database for this
    const now = new Date();
    const daysSinceLastCleanup = this.lastCleanupTime 
      ? (now - this.lastCleanupTime) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (daysSinceLastCleanup >= 1) {
      this.processedReminders.clear();
      this.lastCleanupTime = now;
      console.log('Notification Scheduler: Cleared reminder tracking cache');
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobActive: this.job !== null,
      lastRunTime: this.lastRunTime,
      processedRemindersCount: this.processedReminders.size
    };
  }

  /**
   * Manually trigger reminder processing (for testing)
   */
  async triggerNow() {
    console.log('Manually triggering notification scheduler...');
    await this.processEventReminders();
  }
}

// Create singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;



