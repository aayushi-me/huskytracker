/**
 * Event Scheduler Service
 * Handles automatic event status updates based on time
 * Updates event statuses: PUBLISHED -> IN_PROGRESS -> COMPLETED
 */

const eventService = require('./eventService');

const {
  sendEventReminderEmail
} = require('./notificationService');


class EventScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    // Run every hour (3600000 ms)
    this.intervalMs = parseInt(process.env.EVENT_STATUS_UPDATE_INTERVAL) || 3600000;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('Event scheduler is already running');
      return;
    }

    console.log(`Starting event scheduler (interval: ${this.intervalMs / 1000}s)`);
    
    // Run immediately on start
    this.runStatusUpdates();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runStatusUpdates();
    }, this.intervalMs);
    
    this.isRunning = true;
    console.log('Event scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('Event scheduler is not running');
      return;
    }

    console.log('Stopping event scheduler...');
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
    console.log('Event scheduler stopped');
  }

  /**
   * Run the status update job
   */
  async runStatusUpdates() {
    try {
      console.log('[Event Scheduler] Running status update job...');
      const startTime = Date.now();
      
      const results = await eventService.updateEventStatuses();
      
      const duration = Date.now() - startTime;
      console.log(`[Event Scheduler] Job completed in ${duration}ms`);
      console.log(`[Event Scheduler] Updated: ${results.updated}, Failed: ${results.failed}`);
      
      if (results.events.length > 0) {
        console.log('[Event Scheduler] Updated events:');
        results.events.forEach(event => {
          console.log(`  - ${event.title}: ${event.previousStatus} -> ${event.newStatus}`);
        });
      }
      
      return results;
    } catch (error) {
      console.error('[Event Scheduler] Error during status update:', error.message);
      console.error(error.stack);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      intervalSeconds: this.intervalMs / 1000
    };
  }
}

// Create singleton instance
const eventScheduler = new EventScheduler();

module.exports = eventScheduler;

