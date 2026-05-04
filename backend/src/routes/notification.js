/**
 * Notification Routes
 * Defines all routes for notification operations
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticate);

// Get unread count (must be before /:id routes)
router.get('/unread/count', notificationController.getUnreadCount);

// Get user's notifications
router.get('/me', notificationController.getUserNotifications);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Get notification by ID
router.get('/:id', notificationController.getNotificationById);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;



