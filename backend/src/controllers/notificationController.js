/**
 * Notification Controller
 * Handles HTTP requests for notification operations
 */

const mongoose = require('mongoose');
const { Notification, NotificationStatus } = require('../models/Notification');
const { asyncHandler } = require('../utils/errors');

/**
 * Get user's notifications
 * GET /api/v1/notifications/me
 * Access: Authenticated users
 */
const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const { isRead, type, page = 1, limit = 50 } = req.query; // Increased default limit

  // Build query options
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
  };

  // Build filter query - ensure userId is properly formatted and exclude archived
  const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  // Build base query - exclude archived notifications
  const filterQuery = { 
    user: userIdObjectId,
    status: { $ne: NotificationStatus.ARCHIVED } // Exclude archived notifications
  };
  
  // If isRead is specified, filter by read status (but still exclude archived)
  if (isRead !== undefined && isRead !== null && isRead !== '') {
    const readStatus = isRead === 'true' ? NotificationStatus.READ : NotificationStatus.UNREAD;
    // Combine: status must be READ/UNREAD AND not ARCHIVED
    filterQuery.status = readStatus;
  }
  // If isRead is not specified, filterQuery.status remains { $ne: ARCHIVED }
  // which means it will return both READ and UNREAD (but not ARCHIVED)
  
  if (type) {
    filterQuery.type = type;
  }

  console.log(`[Notifications API] Fetching notifications for user: ${userId}, filter:`, JSON.stringify(filterQuery));
  console.log(`[Notifications API] Query params: page=${options.page}, limit=${options.limit}, isRead=${isRead}`);

  // Get notifications
  const notifications = await Notification.find(filterQuery)
    .populate('event', '_id title')
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .skip(options.skip)
    .lean();
  
  console.log(`[Notifications API] Found ${notifications.length} notifications for user ${userId}`);
  
  // Debug: Check total notifications for this user (any status)
  const totalCountDebug = await Notification.countDocuments({ user: userIdObjectId });
  const unreadCountDebug = await Notification.countDocuments({ 
    user: userIdObjectId, 
    status: NotificationStatus.UNREAD 
  });
  const readCountDebug = await Notification.countDocuments({ 
    user: userIdObjectId, 
    status: NotificationStatus.READ 
  });
  
  console.log(`[Notifications API] Total notifications breakdown for user ${userId}:`);
  console.log(`  - Total (any status): ${totalCountDebug}`);
  console.log(`  - Unread: ${unreadCountDebug}`);
  console.log(`  - Read: ${readCountDebug}`);
  console.log(`  - Returned in response: ${notifications.length}`);
  
  // Log notification details
  if (notifications.length > 0) {
    console.log(`[Notifications API] Notification details:`);
    notifications.forEach((n, idx) => {
      console.log(`  [${idx + 1}] ID: ${n._id}, Status: ${n.status}, Type: ${n.type}, Title: ${n.title}`);
    });
  } else if (totalCountDebug > 0) {
    // Get sample notifications to see what's in the database
    const sampleNotifs = await Notification.find({ user: userIdObjectId }).limit(5).lean();
    console.log(`[Notifications API] Sample notifications in DB (first 5):`);
    sampleNotifs.forEach((n, idx) => {
      console.log(`  [${idx + 1}] ID: ${n._id}, Status: ${n.status}, Type: ${n.type}, Title: ${n.title}`);
    });
  }

  // Get total count for pagination
  const totalCount = await Notification.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalCount / options.limit);

  // Format notifications for response
  const formattedNotifications = notifications.map((n) => {
    // Handle event field - could be ObjectId or populated object
    let relatedEventId = undefined;
    if (n.event) {
      if (typeof n.event === 'object' && n.event._id) {
        // Populated event object
        relatedEventId = { _id: n.event._id.toString(), title: n.event.title };
      } else if (typeof n.event === 'string' || n.event.toString) {
        // Just ObjectId string
        relatedEventId = n.event.toString();
      }
    }

    const notificationId = n._id ? (typeof n._id === 'string' ? n._id : (n._id.toString ? n._id.toString() : String(n._id))) : null;
    
    return {
      _id: notificationId,
      userId: n.user ? (typeof n.user === 'string' ? n.user : (n.user.toString ? n.user.toString() : String(n.user))) : null,
      type: n.type,
      status: n.status,
      title: n.title,
      message: n.message,
      relatedEventId,
      relatedData: n.metadata || {},
      actionUrl: n.actionUrl,
      readAt: n.readAt,
      archivedAt: n.archivedAt,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      isRead: n.status === 'READ',
    };
  });

  res.status(200).json({
    success: true,
    data: {
      notifications: formattedNotifications,
      pagination: {
        currentPage: options.page,
        totalPages,
        totalCount,
      },
    },
  });
});

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread/count
 * Access: Authenticated users
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Ensure userId is properly formatted
  const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  const unreadCount = await Notification.countDocuments({
    user: userIdObjectId,
    status: NotificationStatus.UNREAD
  });

  console.log(`[Notifications] Unread count for user ${userId}: ${unreadCount}`);

  res.status(200).json({
    success: true,
    data: {
      unreadCount,
    },
  });
});

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 * Access: Notification owner
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.userId || req.user?._id || req.user?.id;

  console.log(`[Notifications API] Mark as read request: notificationId=${notificationId}, userId=${userId}`);

  // Ensure userId is properly formatted
  const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  // Find notification and verify ownership
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    console.log(`[Notifications API] Notification not found: ${notificationId}`);
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  // Compare user IDs properly - handle both ObjectId and string formats
  const notificationUserId = notification.user._id || notification.user;
  const notificationUserIdStr = notificationUserId.toString();
  const requestUserIdStr = userIdObjectId.toString ? userIdObjectId.toString() : String(userIdObjectId);

  console.log(`[Notifications API] Comparing user IDs: notification.user=${notificationUserIdStr}, request.user=${requestUserIdStr}`);

  if (notificationUserIdStr !== requestUserIdStr) {
    console.log(`[Notifications API] Authorization failed: user IDs don't match`);
    console.log(`[Notifications API] Notification user ID: ${notificationUserIdStr} (type: ${typeof notificationUserIdStr})`);
    console.log(`[Notifications API] Request user ID: ${requestUserIdStr} (type: ${typeof requestUserIdStr})`);
    console.log(`[Notifications API] Notification object:`, {
      id: notification._id,
      user: notification.user,
      userType: typeof notification.user
    });
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this notification',
    });
  }

  console.log(`[Notifications API] Authorization successful, marking notification as read`);

  // Mark as read
  await notification.markAsRead();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: {
      notification: {
        _id: notification._id,
        isRead: true,
        readAt: notification.readAt,
      },
    },
  });
});

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/read-all
 * Access: Authenticated users
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const result = await Notification.markAllAsRead(userId);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: {
      updatedCount: result.modifiedCount || 0,
    },
  });
});

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 * Access: Notification owner
 */
const getNotificationById = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.userId || req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Ensure userId is properly formatted
  const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  // Find notification and verify ownership
  const notification = await Notification.findById(notificationId)
    .populate('event', '_id title')
    .lean();

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  // Compare user IDs properly - handle both ObjectId and string formats
  const notificationUserId = notification.user._id || notification.user;
  const notificationUserIdStr = notificationUserId.toString();
  const requestUserIdStr = userIdObjectId.toString ? userIdObjectId.toString() : String(userIdObjectId);

  if (notificationUserIdStr !== requestUserIdStr) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this notification',
    });
  }

  // Format notification for response
  let relatedEventId = undefined;
  if (notification.event) {
    if (typeof notification.event === 'object' && notification.event._id) {
      relatedEventId = { _id: notification.event._id.toString(), title: notification.event.title };
    } else if (typeof notification.event === 'string' || notification.event.toString) {
      relatedEventId = notification.event.toString();
    }
  }

  const formattedNotification = {
    _id: notification._id ? (typeof notification._id === 'string' ? notification._id : (notification._id.toString ? notification._id.toString() : String(notification._id))) : null,
    userId: notification.user ? (typeof notification.user === 'string' ? notification.user : (notification.user.toString ? notification.user.toString() : String(notification.user))) : null,
    type: notification.type,
    status: notification.status,
    title: notification.title,
    message: notification.message,
    relatedEventId,
    relatedData: notification.metadata || {},
    actionUrl: notification.actionUrl,
    readAt: notification.readAt,
    archivedAt: notification.archivedAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    isRead: notification.status === 'READ',
  };

  res.status(200).json({
    success: true,
    data: {
      notification: formattedNotification,
    },
  });
});

/**
 * Delete notification
 * DELETE /api/v1/notifications/:id
 * Access: Notification owner
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.userId || req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Ensure userId is properly formatted
  const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  // Find notification and verify ownership
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  // Compare user IDs properly - handle both ObjectId and string formats
  const notificationUserId = notification.user._id || notification.user;
  const notificationUserIdStr = notificationUserId.toString();
  const requestUserIdStr = userIdObjectId.toString ? userIdObjectId.toString() : String(userIdObjectId);

  if (notificationUserIdStr !== requestUserIdStr) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this notification',
    });
  }

  // Delete the notification
  await Notification.findByIdAndDelete(notificationId);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
  });
});

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationById,
  deleteNotification,
};

