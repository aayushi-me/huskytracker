/**
 * Notification Repository
 * Handles database operations for notifications
 */

const { Notification, NotificationStatus } = require('../models/Notification');

class NotificationRepository {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Notification>} Created notification
   */
  async create(notificationData) {
    return await Notification.create(notificationData);
  }

  /**
   * Find notification by ID
   * @param {String} notificationId - Notification ID
   * @param {Object} options - Query options
   * @returns {Promise<Notification>} Notification document
   */
  async findById(notificationId, options = {}) {
    const query = Notification.findById(notificationId);
    
    if (options.populate) {
      const populates = Array.isArray(options.populate) ? options.populate : [options.populate];
      populates.forEach(field => query.populate(field));
    }
    
    return await query.exec();
  }

  /**
   * Find notifications by user with pagination and filters
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of notifications
   */
  async findByUser(userId, options = {}) {
    const {
      status,
      type,
      limit = 20,
      skip = 0,
      sort = { createdAt: -1 }
    } = options;

    const query = { user: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }

    return await Notification.find(query)
      .populate('event', 'title startDate endDate location')
      .populate('comment', 'content')
      .populate('registration', 'status')
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * Count notifications by user with filters
   * @param {String} userId - User ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Number>} Count of notifications
   */
  async countByUser(userId, filters = {}) {
    const query = { user: userId, ...filters };
    return await Notification.countDocuments(query);
  }

  /**
   * Get unread notification count for a user
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Count of unread notifications
   */
  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      user: userId,
      status: NotificationStatus.UNREAD
    });
  }

  /**
   * Update notification by ID
   * @param {String} notificationId - Notification ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Notification>} Updated notification
   */
  async update(notificationId, updateData) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Mark notification as read
   * @param {String} notificationId - Notification ID
   * @returns {Promise<Notification>} Updated notification
   */
  async markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      {
        status: NotificationStatus.READ,
        readAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Mark all user's notifications as read
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { user: userId, status: NotificationStatus.UNREAD },
      {
        status: NotificationStatus.READ,
        readAt: new Date()
      }
    );
  }

  /**
   * Delete notification by ID
   * @param {String} notificationId - Notification ID
   * @returns {Promise<Notification>} Deleted notification
   */
  async delete(notificationId) {
    return await Notification.findByIdAndDelete(notificationId);
  }

  /**
   * Delete multiple notifications by user
   * @param {String} userId - User ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Delete result
   */
  async deleteByUser(userId, filters = {}) {
    return await Notification.deleteMany({ user: userId, ...filters });
  }

  /**
   * Find notifications for batch processing (e.g., scheduled reminders)
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of notifications
   */
  async findForProcessing(filters = {}, options = {}) {
    const {
      limit = 100,
      sort = { createdAt: 1 }
    } = options;

    return await Notification.find(filters)
      .populate('user', 'email firstName lastName notificationPreferences')
      .populate('event', 'title startDate endDate location')
      .sort(sort)
      .limit(limit)
      .lean();
  }

  /**
   * Bulk create notifications
   * @param {Array} notificationDataArray - Array of notification data
   * @returns {Promise<Array>} Array of created notifications
   */
  async bulkCreate(notificationDataArray) {
    return await Notification.insertMany(notificationDataArray);
  }

  /**
   * Find notifications by event
   * @param {String} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of notifications
   */
  async findByEvent(eventId, options = {}) {
    const { limit = 100 } = options;
    
    return await Notification.find({ event: eventId })
      .populate('user', 'email firstName lastName')
      .limit(limit)
      .lean();
  }
}

module.exports = new NotificationRepository();



