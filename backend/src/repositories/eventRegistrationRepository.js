/**
 * EventRegistration Repository
 * Handles all database operations for event registrations
 * Uses repository pattern to separate data access from business logic
 */

const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
const mongoose = require('mongoose');

class EventRegistrationRepository {
  
  /**
   * Create a new registration
   * @param {Object} registrationData - Registration data
   * @param {Object} session - MongoDB session for transactions
   * @returns {Promise<EventRegistration>} Created registration
   */
  async create(registrationData, session = null) {
    const options = session ? { session } : {};
    const registration = new EventRegistration(registrationData);
    return await registration.save(options);
  }

  /**
   * Find registration by ID
   * @param {String} registrationId - Registration ID
   * @param {Object} options - Query options
   * @returns {Promise<EventRegistration|null>} Registration document or null
   */
  async findById(registrationId, options = {}) {
    const query = EventRegistration.findById(registrationId);
    
    if (options.populate) {
      if (options.populate.includes('user')) {
        query.populate('user', 'firstName lastName email university');
      }
      if (options.populate.includes('event')) {
        query.populate('event');
      }
    }
    
    if (options.lean) {
      query.lean();
    }
    
    return await query;
  }

  /**
   * Find registration by user and event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<EventRegistration|null>} Registration document or null
   */
  async findByUserAndEvent(userId, eventId) {
    return await EventRegistration.findOne({ 
      user: userId, 
      event: eventId 
    });
  }

  /**
   * Find all registrations for an event with filters
   * @param {String} eventId - Event ID
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of registrations
   */
  async findByEvent(eventId, filters = {}, options = {}) {
    const {
      page = 1,
      limit = 100,
      sort = { registeredAt: 1 },
      populate = true,
      lean = false
    } = options;

    const skip = (page - 1) * limit;

    const query = EventRegistration.find({ 
      event: eventId, 
      ...filters 
    })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate) {
      query.populate('user', 'firstName lastName email university');
    }

    if (lean) {
      query.lean();
    }

    const [registrations, totalCount] = await Promise.all([
      query,
      EventRegistration.countDocuments({ event: eventId, ...filters })
    ]);

    return {
      registrations,
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
   * Find all registrations for a user with filters
   * @param {String} userId - User ID
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of registrations
   */
  async findByUser(userId, filters = {}, options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = { createdAt: -1 },
      populate = true,
      lean = false
    } = options;

    const skip = (page - 1) * limit;

    const query = EventRegistration.find({ 
      user: userId, 
      ...filters 
    })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate) {
      query.populate({
        path: 'event',
        populate: {
          path: 'organizer',
          select: 'firstName lastName email'
        }
      });
    }

    if (lean) {
      query.lean();
    }

    const [registrations, totalCount] = await Promise.all([
      query,
      EventRegistration.countDocuments({ user: userId, ...filters })
    ]);

    return {
      registrations,
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
   * Update registration by ID
   * @param {String} registrationId - Registration ID
   * @param {Object} updateData - Data to update
   * @param {Object} session - MongoDB session for transactions
   * @returns {Promise<EventRegistration|null>} Updated registration
   */
  async update(registrationId, updateData, session = null) {
    const options = {
      new: true,
      runValidators: true,
      context: 'query'
    };
    
    if (session) {
      options.session = session;
    }

    return await EventRegistration.findByIdAndUpdate(
      registrationId,
      { $set: updateData },
      options
    );
  }

  /**
   * Delete registration by ID (hard delete)
   * @param {String} registrationId - Registration ID
   * @param {Object} session - MongoDB session for transactions
   * @returns {Promise<EventRegistration|null>} Deleted registration
   */
  async delete(registrationId, session = null) {
    const options = session ? { session } : {};
    return await EventRegistration.findByIdAndDelete(registrationId, options);
  }

  /**
   * Get next waitlist position for an event
   * @param {String} eventId - Event ID
   * @returns {Promise<Number>} Next waitlist position
   */
  async getNextWaitlistPosition(eventId) {
    const maxPosition = await EventRegistration.findOne({ 
      event: eventId,
      status: RegistrationStatus.WAITLISTED
    })
      .sort({ waitlistPosition: -1 })
      .select('waitlistPosition')
      .lean();

    return maxPosition ? maxPosition.waitlistPosition + 1 : 1;
  }

  /**
   * Get first waitlisted registration for promotion
   * @param {String} eventId - Event ID
   * @param {Object} session - MongoDB session for transactions
   * @returns {Promise<EventRegistration|null>} First waitlisted registration
   */
  async getFirstWaitlisted(eventId, session = null) {
    const query = EventRegistration.findOne({
      event: eventId,
      status: RegistrationStatus.WAITLISTED
    }).sort({ waitlistPosition: 1, createdAt: 1 });

    if (session) {
      query.session(session);
    }

    return await query;
  }

  /**
   * Count registrations by status
   * @param {String} eventId - Event ID
   * @param {String} status - Registration status
   * @returns {Promise<Number>} Count
   */
  async countByStatus(eventId, status) {
    return await EventRegistration.countDocuments({
      event: eventId,
      status: status
    });
  }

  /**
   * Count active registrations (REGISTERED status)
   * @param {String} eventId - Event ID
   * @returns {Promise<Number>} Count of active registrations
   */
  async countActiveRegistrations(eventId) {
    return await EventRegistration.countDocuments({
      event: eventId,
      status: RegistrationStatus.REGISTERED
    });
  }

  /**
   * Recalculate waitlist positions after removal
   * @param {String} eventId - Event ID
   * @param {Object} session - MongoDB session for transactions
   * @returns {Promise<void>}
   */
  async recalculateWaitlistPositions(eventId, session = null) {
    const options = session ? { session } : {};
    
    const waitlistedRegistrations = await EventRegistration.find({
      event: eventId,
      status: RegistrationStatus.WAITLISTED
    }, null, options).sort({ waitlistPosition: 1, createdAt: 1 });

    for (let i = 0; i < waitlistedRegistrations.length; i++) {
      waitlistedRegistrations[i].waitlistPosition = i + 1;
      await waitlistedRegistrations[i].save(options);
    }
  }

  /**
   * Check if user has active registration for event
   * @param {String} userId - User ID
   * @param {String} eventId - Event ID
   * @returns {Promise<Boolean>} True if user has active registration
   */
  async hasActiveRegistration(userId, eventId) {
    const registration = await EventRegistration.findOne({
      user: userId,
      event: eventId,
      status: { 
        $in: [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED] 
      }
    }).lean();

    return !!registration;
  }

  /**
   * Get registration statistics for an event
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Registration statistics
   */
  async getEventRegistrationStats(eventId) {
    const stats = await EventRegistration.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      registered: 0,
      waitlisted: 0,
      cancelled: 0,
      attended: 0,
      noShow: 0,
      total: 0
    };

    stats.forEach(stat => {
      const status = stat._id.toLowerCase();
      result[status] = stat.count;
      result.total += stat.count;
    });

    return result;
  }

  /**
   * Find registrations for attendance marking
   * @param {String} eventId - Event ID
   * @returns {Promise<Array>} Array of registered users
   */
  async findForAttendance(eventId) {
    return await EventRegistration.find({
      event: eventId,
      status: RegistrationStatus.REGISTERED
    })
      .populate('user', 'firstName lastName email')
      .sort({ user: 1 });
  }

  /**
   * Bulk update registrations
   * @param {Array} registrationIds - Array of registration IDs
   * @param {Object} updateData - Data to update
   * @param {Object} session - MongoDB session for transactions
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdate(registrationIds, updateData, session = null) {
    const options = session ? { session } : {};
    
    return await EventRegistration.updateMany(
      { _id: { $in: registrationIds } },
      { $set: updateData },
      options
    );
  }
}

module.exports = new EventRegistrationRepository();

