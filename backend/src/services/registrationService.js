/**
 * Registration Service
 * Handles all business logic for event registrations
 * Includes capacity management, waitlist logic, and transaction support
 */

const eventRegistrationRepository = require('../repositories/eventRegistrationRepository');
const eventRepository = require('../repositories/eventRepository');
const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
const { Event, EventStatus } = require('../models/Event');
const { Notification, NotificationType } = require('../models/Notification');
const notificationService = require('./notificationService');
const mongoose = require('mongoose');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  RegistrationExistsError,
  RegistrationClosedError
} = require('../utils/errors');

class RegistrationService {
  
  /**
   * Register user for an event
   * Handles capacity checks, waitlist logic
   * Note: Transactions disabled for standalone MongoDB compatibility
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Registration result with status
   */
  async registerForEvent(userId, eventId) {
    // Note: Transactions disabled for standalone MongoDB (development)
    // In production with replica set, enable transactions by uncommenting session code

    try {
      // Check if user has any existing registration
      const existingRegistration = await eventRegistrationRepository.findByUserAndEvent(userId, eventId);
      
      // If user has an active registration, block re-registration
      if (existingRegistration && 
          (existingRegistration.status === RegistrationStatus.REGISTERED || 
           existingRegistration.status === RegistrationStatus.WAITLISTED)) {
        throw new RegistrationExistsError('You are already registered for this event');
      }

      // Fetch event and verify it exists
      const event = await eventRepository.findById(eventId, { lean: false });
      
      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Check event status allows registration
      if (event.status !== EventStatus.PUBLISHED) {
        throw new RegistrationClosedError(`Cannot register for ${event.status.toLowerCase()} event`);
      }

      // Check if event has ended
      if (event.endDate < new Date()) {
        throw new RegistrationClosedError('Cannot register for past events');
      }

      // Check event capacity
      const hasCapacity = event.maxRegistrations === null || 
                          event.currentRegistrations < event.maxRegistrations;

      let registration;

      if (hasCapacity) {
        // If reusing a cancelled registration, update it; otherwise create new
        if (existingRegistration && existingRegistration.status === RegistrationStatus.CANCELLED) {
          // Reuse existing cancelled registration
          existingRegistration.status = RegistrationStatus.REGISTERED;
          existingRegistration.registeredAt = new Date();
          existingRegistration.cancelledAt = null;
          existingRegistration.waitlistPosition = null;
          registration = await existingRegistration.save();
        } else {
          // Create new registration with REGISTERED status
          const registrationData = {
            user: userId,
            event: eventId,
            status: RegistrationStatus.REGISTERED,
            registeredAt: new Date()
          };
          registration = await eventRegistrationRepository.create(registrationData);
        }

        // Note: currentRegistrations is automatically updated by EventRegistration post-save hook

        // Trigger notification (don't block on failure)
        this.sendRegistrationConfirmationNotification(userId, eventId, registration._id)
          .catch(err => console.error('Notification error:', err));

        return {
          success: true,
          registration: await eventRegistrationRepository.findById(registration._id, { 
            populate: ['event', 'user'] 
          }),
          message: 'Successfully registered for event',
          status: 'REGISTERED'
        };
      } else {
        // Event is full - add to waitlist
        const waitlistPosition = await eventRegistrationRepository.getNextWaitlistPosition(eventId);
        
        // If reusing a cancelled registration, update it; otherwise create new
        if (existingRegistration && existingRegistration.status === RegistrationStatus.CANCELLED) {
          // Reuse existing cancelled registration
          existingRegistration.status = RegistrationStatus.WAITLISTED;
          existingRegistration.registeredAt = new Date();
          existingRegistration.cancelledAt = null;
          existingRegistration.waitlistPosition = waitlistPosition;
          registration = await existingRegistration.save();
        } else {
          // Create new registration with WAITLISTED status
          const registrationData = {
            user: userId,
            event: eventId,
            status: RegistrationStatus.WAITLISTED,
            registeredAt: new Date(),
            waitlistPosition: waitlistPosition
          };
          registration = await eventRegistrationRepository.create(registrationData);
        }

        // Trigger waitlist notification
        this.sendWaitlistNotification(userId, eventId, registration._id, waitlistPosition)
          .catch(err => console.error('Notification error:', err));

        return {
          success: true,
          registration: await eventRegistrationRepository.findById(registration._id, { 
            populate: ['event', 'user'] 
          }),
          message: 'Event is full. You have been added to the waitlist',
          status: 'WAITLISTED',
          waitlistPosition: waitlistPosition
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a registration
   * Handles waitlist promotion if event was full
   * @param {String} registrationId - Registration ID
   * @param {String} userId - User ID (for ownership verification)
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelRegistration(registrationId, userId) {
    // Note: Transactions disabled for standalone MongoDB (development)

    try {
      // Fetch registration and verify it exists (without population to get raw ObjectIds)
      const registration = await eventRegistrationRepository.findById(registrationId, { lean: false });
      
      if (!registration) {
        throw new NotFoundError('Registration not found');
      }

      // Verify ownership - use Mongoose .equals() for ObjectId comparison
      // Handle both populated (registration.user._id) and unpopulated (registration.user) cases
      const registrationUserId = registration.user._id || registration.user;
      const userIdToCompare = mongoose.Types.ObjectId.isValid(userId) ? userId : mongoose.Types.ObjectId(userId);
      
      // Use .equals() method for proper ObjectId comparison
      if (!registrationUserId.equals(userIdToCompare)) {
        throw new ForbiddenError('You do not have permission to cancel this registration');
      }

      // Check if already cancelled
      if (registration.status === RegistrationStatus.CANCELLED) {
        throw new BadRequestError('Registration is already cancelled');
      }

      const wasRegistered = registration.status === RegistrationStatus.REGISTERED;
      const wasWaitlisted = registration.status === RegistrationStatus.WAITLISTED;
      const eventId = registration.event;

      // Update registration status to CANCELLED
      registration.status = RegistrationStatus.CANCELLED;
      registration.cancelledAt = new Date();
      await registration.save();

      // If user was registered (not waitlisted), handle capacity and promotion
      if (wasRegistered) {
        // Note: currentRegistrations is automatically updated by EventRegistration post-save hook
        
        // Promote first person from waitlist if any
        await this.promoteFromWaitlist(eventId);
      }

      // If user was waitlisted, recalculate positions
      if (wasWaitlisted) {
        await eventRegistrationRepository.recalculateWaitlistPositions(eventId);
      }

      // Send cancellation notification
      this.sendCancellationNotification(userId, eventId)
        .catch(err => console.error('Notification error:', err));

      return {
        success: true,
        message: 'Registration cancelled successfully',
        registration: await eventRegistrationRepository.findById(registrationId, { 
          populate: ['event', 'user'] 
        })
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Promote first waitlisted user to registered
   * Called when a spot opens up
   * @param {String} eventId - Event ID
   * @returns {Promise<Object|null>} Promoted registration or null
   */
  async promoteFromWaitlist(eventId) {
    try {
      // Get first waitlisted registration
      const firstWaitlisted = await eventRegistrationRepository.getFirstWaitlisted(eventId);
      
      if (!firstWaitlisted) {
        return null; // No one on waitlist
      }

      // Update status to REGISTERED
      firstWaitlisted.status = RegistrationStatus.REGISTERED;
      firstWaitlisted.waitlistPosition = null;
      await firstWaitlisted.save();

      // Note: currentRegistrations is automatically updated by EventRegistration post-save hook

      // Recalculate remaining waitlist positions
      await eventRegistrationRepository.recalculateWaitlistPositions(eventId);

      // Send promotion notification
      const promotedUserId = (firstWaitlisted.user._id || firstWaitlisted.user).toString();
      this.sendWaitlistPromotionNotification(
        promotedUserId, 
        eventId, 
        firstWaitlisted._id
      ).catch(err => console.error('Notification error:', err));

      return {
        success: true,
        registration: firstWaitlisted,
        message: 'User promoted from waitlist'
      };
    } catch (error) {
      console.error('Error promoting from waitlist:', error);
      throw error;
    }
  }

  /**
   * Check if user is eligible to register for event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Eligibility result
   */
  async checkEligibility(userId, eventId) {
    try {
      // Check if user already has active registration
      const existingRegistration = await eventRegistrationRepository.findByUserAndEvent(userId, eventId);
      
      if (existingRegistration && 
          (existingRegistration.status === RegistrationStatus.REGISTERED || 
           existingRegistration.status === RegistrationStatus.WAITLISTED)) {
        return {
          eligible: false,
          reason: 'Already registered for this event',
          status: existingRegistration.status
        };
      }

      // Fetch event
      const event = await eventRepository.findById(eventId, { lean: true });
      
      if (!event) {
        return {
          eligible: false,
          reason: 'Event not found'
        };
      }

      // Check event status
      if (event.status !== EventStatus.PUBLISHED) {
        return {
          eligible: false,
          reason: `Event is ${event.status.toLowerCase()}`
        };
      }

      // Check if event has ended
      if (event.endDate < new Date()) {
        return {
          eligible: false,
          reason: 'Event has already ended'
        };
      }

      // Check capacity
      const hasCapacity = event.maxRegistrations === null || 
                          event.currentRegistrations < event.maxRegistrations;

      return {
        eligible: true,
        hasCapacity: hasCapacity,
        willBeWaitlisted: !hasCapacity,
        availableSpots: event.maxRegistrations ? 
          Math.max(0, event.maxRegistrations - event.currentRegistrations) : null
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's registrations with filters
   * @param {String} userId - User ID
   * @param {Object} filters - Filter options (status, etc.)
   * @param {Object} options - Query options (page, limit, sort)
   * @returns {Promise<Object>} User's registrations with pagination
   */
  async getUserRegistrations(userId, filters = {}, options = {}) {
    try {
      const queryFilters = {};
      
      if (filters.status) {
        queryFilters.status = filters.status;
      }

      const result = await eventRegistrationRepository.findByUser(userId, queryFilters, {
        page: options.page || 1,
        limit: options.limit || 50,
        sort: options.sort || { createdAt: -1 },
        populate: true,
        lean: false
      });

      // Filter out registrations where event is null (event was deleted)
      result.registrations = result.registrations.filter(reg => reg.event !== null);

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get event attendees (for organizers)
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID (must be organizer)
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Event attendees with pagination
   */
  async getEventAttendees(eventId, userId, filters = {}, options = {}) {
    try {
      // Verify user is organizer
      const isOrganizer = await eventRepository.isOrganizer(eventId, userId);
      
      if (!isOrganizer) {
        throw new ForbiddenError('Only event organizers can view attendees');
      }

      const queryFilters = {};
      
      // Default to showing registered users if no status specified
      if (filters.status) {
        queryFilters.status = filters.status;
      } else {
        queryFilters.status = RegistrationStatus.REGISTERED;
      }

      const result = await eventRegistrationRepository.findByEvent(eventId, queryFilters, {
        page: options.page || 1,
        limit: options.limit || 100,
        sort: options.sort || { registeredAt: 1 },
        populate: true,
        lean: false
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark attendance for a registration
   * @param {String} registrationId - Registration ID
   * @param {String} userId - User ID (must be organizer)
   * @param {Boolean} attended - Attendance status
   * @returns {Promise<Object>} Updated registration
   */
  async markAttendance(registrationId, userId, attended = true) {
    try {
      // Fetch registration
      const registration = await eventRegistrationRepository.findById(registrationId, { 
        populate: ['event'] 
      });
      
      if (!registration) {
        throw new NotFoundError('Registration not found');
      }

      // Verify user is organizer
      const registrationEventId = (registration.event._id || registration.event).toString();
      const isOrganizer = await eventRepository.isOrganizer(registrationEventId, userId);
      
      if (!isOrganizer) {
        throw new ForbiddenError('Only event organizers can mark attendance');
      }

      // Check if event has ended (event is populated, so we can access endDate directly)
      if (registration.event.endDate > new Date()) {
        throw new ForbiddenError('Cannot mark attendance before event ends');
      }

      // Check if user was registered (not cancelled or waitlisted)
      if (registration.status !== RegistrationStatus.REGISTERED) {
        throw new BadRequestError('Cannot mark attendance for non-registered users');
      }

      // Update attendance status
      if (attended) {
        registration.status = RegistrationStatus.ATTENDED;
        registration.attendedAt = new Date();
      } else {
        registration.status = RegistrationStatus.NO_SHOW;
      }

      await registration.save();

      return {
        success: true,
        registration: await eventRegistrationRepository.findById(registrationId, { 
          populate: ['event', 'user'] 
        }),
        message: attended ? 'Attendance marked successfully' : 'Marked as no-show'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get registration details
   * @param {String} registrationId - Registration ID
   * @param {String} userId - User ID (for permission check)
   * @returns {Promise<Object>} Registration details
   */
  async getRegistrationDetails(registrationId, userId) {
    try {
      const registration = await eventRegistrationRepository.findById(registrationId, { 
        populate: ['event', 'user'] 
      });
      
      if (!registration) {
        throw new NotFoundError('Registration not found');
      }

      // User can view their own registration or organizer can view
      const registrationUserId = registration.user._id || registration.user;
      const registrationEventId = registration.event._id || registration.event;
      const isOwner = registrationUserId.equals ? registrationUserId.equals(userId) : registrationUserId.toString() === userId.toString();
      const isOrganizer = await eventRepository.isOrganizer(registrationEventId, userId);

      if (!isOwner && !isOrganizer) {
        throw new ForbiddenError('You do not have permission to view this registration');
      }

      return registration;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get registration statistics for an event
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID (must be organizer)
   * @returns {Promise<Object>} Registration statistics
   */
  async getRegistrationStats(eventId, userId) {
    try {
      // Verify user is organizer
      const isOrganizer = await eventRepository.isOrganizer(eventId, userId);
      
      if (!isOrganizer) {
        throw new ForbiddenError('Only event organizers can view statistics');
      }

      const stats = await eventRegistrationRepository.getEventRegistrationStats(eventId);
      const event = await eventRepository.findById(eventId, { lean: true });

      return {
        ...stats,
        capacity: event.maxRegistrations,
        availableSpots: event.maxRegistrations ? 
          Math.max(0, event.maxRegistrations - event.currentRegistrations) : null,
        isFull: event.maxRegistrations ? 
          event.currentRegistrations >= event.maxRegistrations : false
      };
    } catch (error) {
      throw error;
    }
  }

  // Notification helper methods

  async sendRegistrationConfirmationNotification(userId, eventId, registrationId) {
    try {
      const event = await Event.findById(eventId).select('title startDate location').lean();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      await notificationService.createNotification({
        userId,
        type: NotificationType.REGISTRATION_CONFIRMED,
        eventId,
        data: {
          eventTitle: event.title,
          startDate: event.startDate,
          location: event.location,
          eventUrl: `${frontendUrl}/events/${eventId}`,
          registrationId
        }
      });
    } catch (error) {
      console.error('Error sending confirmation notification:', error);
    }
  }

  async sendWaitlistNotification(userId, eventId, registrationId, position) {
    try {
      const event = await Event.findById(eventId).select('title startDate location').lean();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      await notificationService.createNotification({
        userId,
        type: NotificationType.REGISTRATION_WAITLISTED,
        eventId,
        data: {
          eventTitle: event.title,
          startDate: event.startDate,
          location: event.location,
          waitlistPosition: position,
          eventUrl: `${frontendUrl}/events/${eventId}`,
          registrationId
        }
      });
    } catch (error) {
      console.error('Error sending waitlist notification:', error);
    }
  }

  async sendWaitlistPromotionNotification(userId, eventId, registrationId) {
    try {
      const event = await Event.findById(eventId).select('title startDate location').lean();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      await notificationService.createNotification({
        userId,
        type: NotificationType.REGISTRATION_APPROVED,
        eventId,
        data: {
          eventTitle: event.title,
          startDate: event.startDate,
          location: event.location,
          eventUrl: `${frontendUrl}/events/${eventId}`,
          registrationId
        }
      });
    } catch (error) {
      console.error('Error sending promotion notification:', error);
    }
  }

  async sendCancellationNotification(userId, eventId) {
    try {
      const event = await Event.findById(eventId).select('title').lean();
      
      await Notification.create({
        user: userId,
        type: NotificationType.EVENT_CANCELLED,
        title: 'Registration Cancelled',
        message: `Your registration for "${event.title}" has been cancelled`,
        event: eventId,
        actionUrl: `/events/${eventId}`,
        metadata: {
          eventTitle: event.title,
          cancellationType: 'user_initiated'
        }
      });
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }
}

module.exports = new RegistrationService();
