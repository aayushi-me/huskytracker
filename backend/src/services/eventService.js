/**
 * Event Service
 * Contains business logic for event management
 * Handles validation, capacity management, status transitions, and waitlist logic
 */

const eventRepository = require('../repositories/eventRepository');
const { EventStatus } = require('../models/Event');
const notificationService = require('./notificationService');
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../utils/errors');

const {
  sendEventUpdateEmail,
  sendEventCancellationEmail
} = require('../services/notificationService');
const eventRegistrationRepository = require('../repositories/eventRegistrationRepository');


class EventService {
  /**
   * Valid status transitions
   * Defines which status changes are allowed
   */
  static STATUS_TRANSITIONS = {
    [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
    [EventStatus.PUBLISHED]: [EventStatus.IN_PROGRESS, EventStatus.CANCELLED],
    [EventStatus.IN_PROGRESS]: [EventStatus.COMPLETED, EventStatus.CANCELLED],
    [EventStatus.CANCELLED]: [], // Cannot change from CANCELLED
    [EventStatus.COMPLETED]: [] // Cannot change from COMPLETED
  };

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @param {String} organizerId - User ID of organizer
   * @returns {Promise<Event>} Created event
   */
  async createEvent(eventData, organizerId) {
    // Set organizer
    eventData.organizer = organizerId;

    // Set default status
    if (!eventData.status) {
      eventData.status = EventStatus.DRAFT;
    }

    // Validate dates
    this.validateEventDates(eventData.startDate, eventData.endDate);

    // Validate status (only DRAFT allowed on creation)
    if (eventData.status !== EventStatus.DRAFT && eventData.status !== EventStatus.PUBLISHED) {
      throw new ValidationError('New events can only be created as DRAFT or PUBLISHED');
    }

    // If publishing directly, validate all required fields
    if (eventData.status === EventStatus.PUBLISHED) {
      this.validatePublishRequirements(eventData);
    }

    try {
      const event = await eventRepository.create(eventData);
      return await eventRepository.findById(event._id, { populate: ['organizer'] });
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ValidationError(this.formatMongooseErrors(error));
      }
      throw error;
    }
  }

  /**
   * Get event by ID
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID (optional, for authorization)
   * @returns {Promise<Event>} Event document
   */
  async getEventById(eventId, userId = null) {
    const event = await eventRepository.findById(eventId, { populate: ['organizer'] });
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // If event is not public and user is not organizer, deny access
    if (!event.isPublic && userId) {
      if (event.organizer._id.toString() !== userId.toString()) {
        throw new ForbiddenError('You do not have permission to view this event');
      }
    }

    // If event is DRAFT, only organizer can view
    if (event.status === EventStatus.DRAFT && userId) {
      if (event.organizer._id.toString() !== userId.toString()) {
        throw new ForbiddenError('This event is not yet published');
      }
    }

    return event;
  }

  /**
   * Get all events with filters and pagination
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @param {String} userId - User ID (optional)
   * @returns {Promise<Object>} Events and metadata
   */
  async getEvents(filters = {}, options = {}, userId = null) {
    // If not organizer/admin, only show published events
    if (!filters.organizer && (!userId || !filters.includeUnpublished)) {
      filters.status = EventStatus.PUBLISHED;
      filters.isPublic = true;
    }

    return await eventRepository.findAll(filters, {
      ...options,
      populate: true
    });
  }

  /**
   * Get upcoming events
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Events and metadata
   */
  async getUpcomingEvents(filters = {}, options = {}) {
    return await eventRepository.findUpcoming(filters, {
      ...options,
      populate: true
    });
  }

  /**
   * Get events by organizer
   * @param {String} organizerId - Organizer user ID
   * @param {String} requesterId - User making request
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Events and metadata
   */
  async getEventsByOrganizer(organizerId, requesterId, options = {}) {
    // Only organizer themselves can view their events (unless admin)
    // This check should be done in controller with role check
    return await eventRepository.findByOrganizer(organizerId, options);
  }

  /**
   * Get draft events by organizer
   * @param {String} organizerId - Organizer user ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Draft events and metadata
   */
  async getDraftEventsByOrganizer(organizerId, options = {}) {
    const filters = {
      organizer: organizerId,
      status: EventStatus.DRAFT
    };
    
    return await eventRepository.findAll(filters, {
      ...options,
      populate: true
    });
  }

  /**
   * Update event
   * @param {String} eventId - Event ID
   * @param {Object} updateData - Data to update
   * @param {String} userId - User ID making update
   * @returns {Promise<Event>} Updated event
   */
  async updateEvent(eventId, updateData, userId) {
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check if user is organizer
    if (event.organizer._id.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to update this event');
    }

    // Validate status transitions if status is being changed
    if (updateData.status && updateData.status !== event.status) {
      this.validateStatusTransition(event.status, updateData.status);
    }

    // Validate dates if being updated
    // Only validate start date in future if it's being changed
    if (updateData.startDate || updateData.endDate) {
      const newStartDate = updateData.startDate || event.startDate;
      const newEndDate = updateData.endDate || event.endDate;
      
      const start = new Date(newStartDate);
      const end = new Date(newEndDate);
      
      // Validate dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid start or end date');
      }
      
      // Extract date strings (YYYY-MM-DD) using local date components to avoid timezone issues
      // This ensures we compare the actual calendar dates, not UTC dates
      const startYear = start.getFullYear();
      const startMonth = String(start.getMonth() + 1).padStart(2, '0');
      const startDay = String(start.getDate()).padStart(2, '0');
      const startDateOnly = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = end.getFullYear();
      const endMonth = String(end.getMonth() + 1).padStart(2, '0');
      const endDay = String(end.getDate()).padStart(2, '0');
      const endDateOnly = `${endYear}-${endMonth}-${endDay}`;
      
      const isSameDate = startDateOnly === endDateOnly;
      
      // For multi-day events: only check that end date is after start date (ignore time)
      // For same-day events: check both date and time, plus minimum duration
      if (!isSameDate) {
        // Multi-day event: compare date strings
        if (endDateOnly <= startDateOnly) {
          throw new ValidationError(`End date (${endDateOnly}) must be after start date (${startDateOnly})`);
        }
        // For multi-day events, times don't matter - validation passes
      } else {
        // Same-day event: validate time and duration
        if (end <= start) {
          throw new ValidationError('End time must be after start time for same-day events');
        }
        
        // Validate minimum duration (30 minutes) for same-day events
        const minDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
        if (end - start < minDuration) {
          throw new ValidationError('Event must be at least 30 minutes long');
        }
      }
      
      // Only validate start date is in future if it's being changed
      if (updateData.startDate) {
        const now = new Date();
        if (start <= now) {
          throw new ValidationError('Event start date must be in the future');
        }
      }
    }

    // If publishing, validate requirements
    if (updateData.status === EventStatus.PUBLISHED && event.status === EventStatus.DRAFT) {
      this.validatePublishRequirements({ ...event.toObject(), ...updateData });
    }

    // Cannot change capacity if it would be less than current registrations
    if (updateData.maxRegistrations !== undefined) {
      if (updateData.maxRegistrations !== null &&
        updateData.maxRegistrations < event.currentRegistrations) {
        throw new ValidationError(
          `Cannot set capacity to ${updateData.maxRegistrations} when ${event.currentRegistrations} users are already registered`
        );
      }
    }

    // Cannot update certain fields after event is completed
    if (event.status === EventStatus.COMPLETED) {
      throw new ValidationError('Cannot update a completed event');
    }

    try {
      const updatedEvent = await eventRepository.update(eventId, updateData);
      
      // Notify registered users about significant updates (if event is published)
      if (event.status === EventStatus.PUBLISHED && event.currentRegistrations > 0) {
        // Check if significant fields were updated
        const significantFields = ['title', 'startDate', 'endDate', 'location'];
        const hasSignificantChanges = significantFields.some(field =>
          updateData[field] !== undefined &&
          JSON.stringify(updateData[field]) !== JSON.stringify(event[field])
        );
        
        if (hasSignificantChanges) {
          // Trigger notification asynchronously (don't block on failure)
          this.notifyEventUpdate(eventId, updateData)
            .catch(err => console.error('Failed to send event update notifications:', err));
        }
      }
      
      return updatedEvent;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ValidationError(this.formatMongooseErrors(error));
      }
      throw error;
    }
  }
  
  /**
   * Helper method to notify users about event updates
   * @param {String} eventId - Event ID
   * @param {Object} updateData - Updated fields
   */
  async notifyEventUpdate(eventId, updateData) {
    try {
      const changes = [];
      if (updateData.title) changes.push('Event title updated');
      if (updateData.startDate) changes.push('Start time changed');
      if (updateData.endDate) changes.push('End time changed');
      if (updateData.location) changes.push('Location changed');
      
      const changeDescription = changes.join(', ');
      await notificationService.notifyEventUpdate(eventId, changeDescription);
    } catch (error) {
      console.error('Error notifying event update:', error);
    }
  }

  /**
   * Delete event
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID making deletion
   * @param {Boolean} isAdmin - Whether user is admin
   * @returns {Promise<Object>} Deletion result
   */
  async deleteEvent(eventId, userId, isAdmin = false) {
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check permissions
    if (!isAdmin && event.organizer._id.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to delete this event');
    }

    // If event has registrations, soft delete (cancel)
    if (event.currentRegistrations > 0) {
      const cancelledEvent = await eventRepository.softDelete(eventId);
      return {
        deleted: false,
        cancelled: true,
        event: cancelledEvent,
        message: 'Event has been cancelled due to existing registrations'
      };
    }

    // Hard delete if no registrations
    await eventRepository.delete(eventId);
    return {
      deleted: true,
      cancelled: false,
      message: 'Event has been permanently deleted'
    };
  }

  /**
   * Publish event (transition from DRAFT to PUBLISHED)
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID
   * @returns {Promise<Event>} Published event
   */
  async publishEvent(eventId, userId) {
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.organizer._id.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to publish this event');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new ValidationError('Only draft events can be published');
    }

    this.validatePublishRequirements(event);

    return await eventRepository.updateStatus(eventId, EventStatus.PUBLISHED);
  }

  /**
   * Cancel event
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID
   * @returns {Promise<Event>} Cancelled event
   */
  async cancelEvent(eventId, userId) {
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.organizer._id.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to cancel this event');
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new ValidationError('Cannot cancel a completed event');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new ValidationError('Event is already cancelled');
    }

    const cancelledEvent = await eventRepository.updateStatus(eventId, EventStatus.CANCELLED);
    
    // Trigger notifications to registered users (don't block on failure)
    if (event.currentRegistrations > 0) {
      notificationService.notifyEventCancellation(eventId)
        .catch(err => console.error('Failed to send event cancellation notifications:', err));
    }
    
    return cancelledEvent;
  }

  /**
   * Check if user can register for event
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Eligibility result
   */
  async canUserRegister(eventId, userId) {
    const event = await eventRepository.findById(eventId);
    
    if (!event) {
      return { canRegister: false, reason: 'Event not found' };
    }

    // Check event status
    if (event.status !== EventStatus.PUBLISHED) {
      return { canRegister: false, reason: 'Event is not published' };
    }

    // Check if event has passed
    if (event.endDate < new Date()) {
      return { canRegister: false, reason: 'Event has already ended' };
    }

    // Check capacity
    if (event.maxRegistrations !== null && event.currentRegistrations >= event.maxRegistrations) {
      return { canRegister: false, reason: 'Event is full', waitlistAvailable: true };
    }

    // Check if user is already registered (this would need EventRegistration check)
    // This is a simplified check - full implementation in registration service
    
    return { canRegister: true, reason: 'Eligible to register' };
  }

  /**
   * Get event capacity info
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Capacity information
   */
  async getEventCapacity(eventId) {
    const stats = await eventRepository.getEventStats(eventId);
    
    if (!stats) {
      throw new NotFoundError('Event not found');
    }

    return stats;
  }

  /**
   * Update events that need status changes based on time
   * Called by scheduled job
   * @returns {Promise<Object>} Update results
   */
  async updateEventStatuses() {
    const now = new Date();
    const results = {
      updated: 0,
      failed: 0,
      events: []
    };

    // Find published events that should transition to IN_PROGRESS
    const { Event } = require('../models/Event');
    const eventsToStart = await Event.find({
      status: EventStatus.PUBLISHED,
      startDate: { $lte: now },
      endDate: { $gt: now }
    });

    for (const event of eventsToStart) {
      try {
        await eventRepository.updateStatus(event._id, EventStatus.IN_PROGRESS);
        results.updated++;
        results.events.push({
          id: event._id,
          title: event.title,
          previousStatus: EventStatus.PUBLISHED,
          newStatus: EventStatus.IN_PROGRESS
        });
      } catch (error) {
        results.failed++;
        console.error(`Failed to update event ${event._id} to IN_PROGRESS:`, error.message);
      }
    }

    // Find in-progress events that should transition to COMPLETED
    const eventsToComplete = await Event.find({
      status: EventStatus.IN_PROGRESS,
      endDate: { $lt: now }
    });

    for (const event of eventsToComplete) {
      try {
        await eventRepository.updateStatus(event._id, EventStatus.COMPLETED);
        results.updated++;
        results.events.push({
          id: event._id,
          title: event.title,
          previousStatus: EventStatus.IN_PROGRESS,
          newStatus: EventStatus.COMPLETED
        });
      } catch (error) {
        results.failed++;
        console.error(`Failed to update event ${event._id} to COMPLETED:`, error.message);
      }
    }

    return results;
  }

  /**
   * Search events
   * @param {String} searchText - Search query
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Search results
   */
  async searchEvents(searchText, filters = {}, options = {}) {
    if (!searchText || searchText.trim().length === 0) {
      throw new ValidationError('Search query is required');
    }

    return await eventRepository.search(searchText, filters, {
      ...options,
      populate: true
    });
  }

  /**
   * Get events by category
   * @param {String} category - Event category
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Events
   */
  async getEventsByCategory(category, options = {}) {
    const validCategories = ['Academic', 'Career', 'Clubs', 'Sports', 'Social', 'Cultural', 'Other'];
    
    if (!validCategories.includes(category)) {
      throw new ValidationError(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    return await eventRepository.findByCategory(category, {
      ...options,
      populate: true
    });
  }

  // ========== Validation Helper Methods ==========

  /**
   * Validate event dates
   * @param {Date} startDate - Event start date
   * @param {Date} endDate - Event end date
   * @throws {ValidationError} If dates are invalid
   */
  validateEventDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start <= now) {
      throw new ValidationError('Event start date must be in the future');
    }

    // Extract date strings (YYYY-MM-DD) using local date components to avoid timezone issues
    // This ensures we compare the actual calendar dates, not UTC dates
    const startYear = start.getFullYear();
    const startMonth = String(start.getMonth() + 1).padStart(2, '0');
    const startDay = String(start.getDate()).padStart(2, '0');
    const startDateOnly = `${startYear}-${startMonth}-${startDay}`;
    
    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    const endDateOnly = `${endYear}-${endMonth}-${endDay}`;
    
    const isSameDate = startDateOnly === endDateOnly;
    
    // For multi-day events: only check that end date is after start date (ignore time)
    // For same-day events: check both date and time, plus minimum duration
    if (!isSameDate) {
      // Multi-day event: compare date strings
      if (endDateOnly <= startDateOnly) {
        throw new ValidationError(`End date (${endDateOnly}) must be after start date (${startDateOnly})`);
      }
      // For multi-day events, times don't matter - validation passes
    } else {
      // Same-day event: validate time and duration
      if (end <= start) {
        throw new ValidationError('End time must be after start time for same-day events');
      }
      
      // Validate minimum duration (30 minutes) for same-day events
      const minDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
      if (end - start < minDuration) {
        throw new ValidationError('Event must be at least 30 minutes long');
      }
    }
  }

  /**
   * Validate status transition
   * @param {String} currentStatus - Current status
   * @param {String} newStatus - Desired new status
   * @throws {ValidationError} If transition is invalid
   */
  validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = EventService.STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none'}`
      );
    }
  }

  /**
   * Validate requirements for publishing an event
   * @param {Object} eventData - Event data
   * @throws {ValidationError} If requirements not met
   */
  validatePublishRequirements(eventData) {
    const requiredFields = ['title', 'description', 'startDate', 'endDate', 'location', 'category'];
    const missingFields = [];

    for (const field of requiredFields) {
      if (!eventData[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Cannot publish event. Missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Validate location has required fields
    if (eventData.location) {
      if (!eventData.location.name) {
        throw new ValidationError('Location name is required to publish event');
      }
      
      if (eventData.location.isVirtual && !eventData.location.virtualLink) {
        throw new ValidationError('Virtual link is required for virtual events');
      }
    }
  }

  /**
   * Format Mongoose validation errors
   * @param {Error} error - Mongoose validation error
   * @returns {String} Formatted error message
   */
  formatMongooseErrors(error) {
    if (error.errors) {
      const messages = Object.values(error.errors).map(err => err.message);
      return messages.join('; ');
    }
    return error.message;
  }
}

module.exports = new EventService();

