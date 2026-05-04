/**
 * Notification Service Unit Tests
 * Tests business logic for notification management
 */

const notificationService = require('../../src/services/notificationService');
const notificationRepository = require('../../src/repositories/notificationRepository');
const { sendNotificationEmail } = require('../../src/utils/email');
const User = require('../../src/models/User');
const { Event } = require('../../src/models/Event');
const { NotificationType } = require('../../src/models/Notification');

// Mock dependencies
jest.mock('../../src/repositories/notificationRepository');
jest.mock('../../src/utils/email');
jest.mock('../../src/models/User');
jest.mock('../../src/models/Event');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      firstName: 'John',
      notificationPreferences: {
        email: {
          eventReminders: true
        }
      }
    };

    const mockNotification = {
      _id: 'notif123',
      user: 'user123',
      type: NotificationType.EVENT_REMINDER,
      title: 'Event Reminder',
      message: 'Test message'
    };

    it('should create notification with valid data', async () => {
      User.findById.mockResolvedValue(mockUser);
      notificationRepository.create.mockResolvedValue(mockNotification);
      sendNotificationEmail.mockResolvedValue({ success: true });

      const result = await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        eventId: 'event123',
        data: {
          eventTitle: 'Test Event',
          startDate: new Date()
        }
      });

      expect(result).toEqual(mockNotification);
      expect(notificationRepository.create).toHaveBeenCalled();
    });

    it('should send email if user preferences allow', async () => {
      User.findById.mockResolvedValue(mockUser);
      notificationRepository.create.mockResolvedValue(mockNotification);
      sendNotificationEmail.mockResolvedValue({ success: true });

      await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        data: { eventTitle: 'Test Event' }
      });

      expect(sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          userName: mockUser.firstName,
          type: NotificationType.EVENT_REMINDER
        })
      );
    });

    it('should not send email if user preferences disallow', async () => {
      const userWithoutEmailPref = {
        ...mockUser,
        notificationPreferences: {
          email: {
            eventReminders: false
          }
        }
      };

      User.findById.mockResolvedValue(userWithoutEmailPref);
      notificationRepository.create.mockResolvedValue(mockNotification);

      await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        data: { eventTitle: 'Test Event' }
      });

      expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should not send email during quiet hours', async () => {
      const userWithQuietHours = {
        ...mockUser,
        notificationPreferences: {
          email: {
            eventReminders: true
          },
          quietHours: {
            enabled: true,
            start: '00:00',
            end: '23:59'
          }
        }
      };

      User.findById.mockResolvedValue(userWithQuietHours);
      notificationRepository.create.mockResolvedValue(mockNotification);

      await notificationService.createNotification({
        userId: 'user123',
        type: NotificationType.EVENT_REMINDER,
        data: { eventTitle: 'Test Event' }
      });

      expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should throw error for invalid notification type', async () => {
      User.findById.mockResolvedValue(mockUser);

      await expect(
        notificationService.createNotification({
          userId: 'user123',
          type: 'INVALID_TYPE',
          data: {}
        })
      ).rejects.toThrow('Invalid notification type');
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        notificationService.createNotification({
          userId: 'nonexistent',
          type: NotificationType.EVENT_REMINDER,
          data: {}
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserNotifications', () => {
    const mockNotifications = [
      { _id: 'notif1', message: 'Test 1' },
      { _id: 'notif2', message: 'Test 2' }
    ];

    it('should retrieve user notifications with pagination', async () => {
      notificationRepository.findByUser.mockResolvedValue(mockNotifications);
      notificationRepository.countByUser.mockResolvedValue(25);

      const result = await notificationService.getUserNotifications('user123', {
        page: 1,
        limit: 20
      });

      expect(result.notifications).toEqual(mockNotifications);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 2,
        totalCount: 25,
        limit: 20,
        hasNextPage: true,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      notificationRepository.findByUser.mockResolvedValue(mockNotifications);
      notificationRepository.countByUser.mockResolvedValue(2);

      await notificationService.getUserNotifications('user123', {
        status: 'UNREAD',
        type: NotificationType.EVENT_REMINDER
      });

      expect(notificationRepository.findByUser).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          status: 'UNREAD',
          type: NotificationType.EVENT_REMINDER
        })
      );
    });
  });

  describe('markAsRead', () => {
    const mockNotification = {
      _id: 'notif123',
      user: 'user123'
    };

    it('should mark notification as read', async () => {
      notificationRepository.findById.mockResolvedValue(mockNotification);
      notificationRepository.markAsRead.mockResolvedValue({
        ...mockNotification,
        status: 'READ'
      });

      const result = await notificationService.markAsRead('notif123', 'user123');

      expect(notificationRepository.markAsRead).toHaveBeenCalledWith('notif123');
      expect(result.status).toBe('READ');
    });

    it('should throw error if notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      await expect(
        notificationService.markAsRead('nonexistent', 'user123')
      ).rejects.toThrow('Notification not found');
    });

    it('should throw error if user does not own notification', async () => {
      notificationRepository.findById.mockResolvedValue({
        ...mockNotification,
        user: 'otheruser'
      });

      await expect(
        notificationService.markAsRead('notif123', 'user123')
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      notificationRepository.markAllAsRead.mockResolvedValue({
        modifiedCount: 5
      });

      const result = await notificationService.markAllAsRead('user123');

      expect(result.modifiedCount).toBe(5);
      expect(result.message).toContain('5 notification(s) marked as read');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      notificationRepository.getUnreadCount.mockResolvedValue(8);

      const count = await notificationService.getUnreadCount('user123');

      expect(count).toBe(8);
      expect(notificationRepository.getUnreadCount).toHaveBeenCalledWith('user123');
    });
  });

  describe('deleteNotification', () => {
    const mockNotification = {
      _id: 'notif123',
      user: 'user123'
    };

    it('should delete notification', async () => {
      notificationRepository.findById.mockResolvedValue(mockNotification);
      notificationRepository.delete.mockResolvedValue(mockNotification);

      const result = await notificationService.deleteNotification('notif123', 'user123');

      expect(result.message).toBe('Notification deleted successfully');
      expect(notificationRepository.delete).toHaveBeenCalledWith('notif123');
    });

    it('should throw error if user does not own notification', async () => {
      notificationRepository.findById.mockResolvedValue({
        ...mockNotification,
        user: 'otheruser'
      });

      await expect(
        notificationService.deleteNotification('notif123', 'user123')
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('createBulkNotifications', () => {
    it('should create multiple notifications', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        notificationPreferences: {}
      };

      User.findById.mockResolvedValue(mockUser);
      notificationRepository.create.mockResolvedValue({
        _id: 'notif123'
      });

      const notificationData = [
        {
          userId: 'user1',
          type: NotificationType.EVENT_UPDATED,
          data: { eventTitle: 'Event 1' }
        },
        {
          userId: 'user2',
          type: NotificationType.EVENT_UPDATED,
          data: { eventTitle: 'Event 2' }
        }
      ];

      const result = await notificationService.createBulkNotifications(notificationData);

      expect(result.length).toBe(2);
    });
  });
});



