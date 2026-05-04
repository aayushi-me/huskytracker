/**
 * Event Repository
 * Handles all database operations for events
 * Uses repository pattern to separate data access from business logic
 */

const { Event, EventStatus } = require('../models/Event');
const mongoose = require('mongoose');

class EventRepository {
  
    /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Promise<Event>} Created event
   */
  async create(eventData) {
    const event = new Event(eventData);
    return await event.save();
  }

  /**
   * Find event by ID
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Event|null>} Event document or null
   */
  async findById(eventId, options = {}) {
    const query = Event.findById(eventId);
    
    if (options.populate) {
      if (options.populate.includes('organizer')) {
        query.populate('organizer', 'firstName lastName email university role');
      }
    }
    
    if (options.lean) {
      query.lean();
    }
    
    return await query;
  }

  /**
   * Find all events with filters, pagination, and sorting
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options (page, limit, sort, populate)
   * @returns {Promise<Object>} Events and metadata
   */
  async findAll(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { startDate: 1 },
      populate = false,
      lean = true
    } = options;

    const skip = (page - 1) * limit;

    // Build query
    const query = Event.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate) {
      query.populate('organizer', 'firstName lastName email university');
    }

    if (lean) {
      query.lean();
    }

    const [events, totalCount] = await Promise.all([
      query,
      Event.countDocuments(filters)
    ]);

    return {
      events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Find upcoming published events
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Events and metadata
   */
  async findUpcoming(filters = {}, options = {}) {
    const upcomingFilters = {
      status: EventStatus.PUBLISHED,
      startDate: { $gt: new Date() },
      isPublic: true,
      ...filters
    };

    return await this.findAll(upcomingFilters, {
      ...options,
      sort: { startDate: 1 }
    });
  }

  /**
   * Find events by organizer
   * @param {String} organizerId - Organizer user ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Events and metadata
   */
  async findByOrganizer(organizerId, options = {}) {
    const filters = { organizer: organizerId };
    return await this.findAll(filters, {
      ...options,
      sort: { createdAt: -1 },
      populate: false
    });
  }

  /**
   * Find events by category
   * @param {String} category - Event category
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Events and metadata
   */
  async findByCategory(category, options = {}) {
    const filters = {
      category,
      status: EventStatus.PUBLISHED,
      startDate: { $gt: new Date() }
    };
    return await this.findAll(filters, options);
  }

  /**
   * Search events by text
   * @param {String} searchText - Search query
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options (includes sort parameter)
   * @returns {Promise<Object>} Events and metadata
   */
  async search(searchText, filters = {}, options = {}) {
    const searchFilters = {
      $text: { $search: searchText },
      status: EventStatus.PUBLISHED,
      ...filters
    };

    // Build sort object based on sort parameter
    let sortObj = {};
    const sortParam = options.sort || 'relevance';
    
    if (sortParam === 'relevance' || sortParam === '-relevance') {
      // Default: sort by text score relevance
      sortObj = { score: { $meta: 'textScore' } };
    } else if (sortParam === 'popularity') {
      sortObj = { currentRegistrations: -1 };
    } else if (sortParam === '-popularity') {
      sortObj = { currentRegistrations: 1 };
    } else if (sortParam.startsWith('-')) {
      // Descending sort
      sortObj[sortParam.substring(1)] = -1;
    } else {
      // Ascending sort
      sortObj[sortParam] = 1;
    }

    return await this.findAll(searchFilters, {
      ...options,
      sort: sortObj
    });
  }

  /**
   * Update event by ID
   * @param {String} eventId - Event ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Event|null>} Updated event
   */
  async update(eventId, updateData) {
    // Note: We skip Mongoose validators for date fields because:
    // 1. Mongoose validators run before our service-level validation
    // 2. During updates, validators may compare against old values
    // 3. Our service-level validation in eventService.updateEvent is more sophisticated
    //    and handles multi-day vs same-day events correctly
    return await Event.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { 
        new: true, 
        runValidators: false, // Disable Mongoose validators - we validate in service layer
        context: 'query'
      }
    ).populate('organizer', 'firstName lastName email university');
  }

  /**
   * Delete event by ID (hard delete)
   * @param {String} eventId - Event ID
   * @returns {Promise<Event|null>} Deleted event
   */
  async delete(eventId) {
    return await Event.findByIdAndDelete(eventId);
  }

  /**
   * Soft delete event (set status to CANCELLED)
   * @param {String} eventId - Event ID
   * @returns {Promise<Event|null>} Cancelled event
   */
  async softDelete(eventId) {
    return await Event.findByIdAndUpdate(
      eventId,
      { $set: { status: EventStatus.CANCELLED } },
      { new: true }
    );
  }

  /**
   * Increment event registration count
   * @param {String} eventId - Event ID
   * @returns {Promise<Event|null>} Updated event
   */
  async incrementRegistrations(eventId) {
    return await Event.findByIdAndUpdate(
      eventId,
      { $inc: { currentRegistrations: 1 } },
      { new: true }
    );
  }

  /**
   * Decrement event registration count
   * @param {String} eventId - Event ID
   * @returns {Promise<Event|null>} Updated event
   */
  async decrementRegistrations(eventId) {
    return await Event.findByIdAndUpdate(
      eventId,
      { $inc: { currentRegistrations: -1 } },
      { new: true }
    );
  }

  /**
   * Find events that need status updates
   * @returns {Promise<Array>} Events needing status updates
   */
  async findEventsNeedingStatusUpdate() {
    const now = new Date();
    
    // Find published events that should be IN_PROGRESS (if we had that status)
    // Or find events that should be COMPLETED
    const eventsToComplete = await Event.find({
      status: EventStatus.PUBLISHED,
      endDate: { $lt: now }
    });

    return eventsToComplete;
  }

  /**
   * Update event status
   * @param {String} eventId - Event ID
   * @param {String} status - New status
   * @returns {Promise<Event|null>} Updated event
   */
  async updateStatus(eventId, status) {
    return await Event.findByIdAndUpdate(
      eventId,
      { $set: { status } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Check if user is organizer of event
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} True if user is organizer
   */
  async isOrganizer(eventId, userId) {
    const event = await Event.findById(eventId).lean();
    if (!event) return false;
    return event.organizer.toString() === userId.toString();
  }

  /**
   * Get event statistics for organizer
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Event statistics
   */
  async getEventStats(eventId) {
    const event = await Event.findById(eventId).lean();
    if (!event) return null;

    return {
      totalRegistrations: event.currentRegistrations,
      maxRegistrations: event.maxRegistrations,
      availableSpots: event.maxRegistrations ? event.maxRegistrations - event.currentRegistrations : null,
      isFull: event.maxRegistrations ? event.currentRegistrations >= event.maxRegistrations : false,
      status: event.status
    };
  }

  /**
   * Bulk update event statuses
   * @param {Array} eventIds - Array of event IDs
   * @param {String} status - New status
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdateStatus(eventIds, status) {
    return await Event.updateMany(
      { _id: { $in: eventIds } },
      { $set: { status } }
    );
  }

  /**
   * Count events by filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Number>} Count
   */
  async count(filters = {}) {
    return await Event.countDocuments(filters);
  }
}

module.exports = new EventRepository();

