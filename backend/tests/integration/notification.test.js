/**
 * Notification API Integration Tests
 * Tests notification endpoints with authentication and database
 */

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../src/models/User');
const { Event, EventStatus } = require('../../src/models/Event');
const { EventRegistration, RegistrationStatus } = require('../../src/models/EventRegistration');
const { Notification, NotificationType, NotificationStatus } = require('../../src/models/Notification');
const { generateAccessToken } = require('../../src/utils/jwt');

let mongoServer;
let testUser;
let testOrganizer;
let testEvent;
let testToken;
let organizerToken;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections
  await User.deleteMany({});
  await Event.deleteMany({});
  await EventRegistration.deleteMany({});
  await Notification.deleteMany({});

  // Create test user
  testUser = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'Password123!',
    university: 'Test University',
    role: 'STUDENT',
    notificationPreferences: {
      email: {
        eventReminders: true,
        eventUpdates: true,
        newComments: true
      },
      reminderTime: 24
    }
  });

  // Create test organizer
  testOrganizer = await User.create({
    firstName: 'Organizer',
    lastName: 'User',
    email: 'organizer@example.com',
    password: 'Password123!',
    university: 'Test University',
    role: 'ORGANIZER'
  });

  // Create test event
  testEvent = await Event.create({
    title: 'Test Event',
    description: 'Test event description',
    organizer: testOrganizer._id,
    category: 'Academic',
    status: EventStatus.PUBLISHED,
    startDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    endDate: new Date(Date.now() + 50 * 60 * 60 * 1000),
    location: {
      name: 'Test Location',
      address: '123 Test St'
    },
    maxRegistrations: 50
  });

  // Generate auth tokens
  testToken = generateAccessToken({ id: testUser._id, role: testUser.role });
  organizerToken = generateAccessToken({ id: testOrganizer._id, role: testOrganizer.role });
});

describe('Notification API Tests', () => {
  describe('GET /api/v1/notifications/me', () => {
    it('should retrieve user notifications with pagination', async () => {
      // Create test notifications
      await Notification.create([
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Reminder 1',
          message: 'Test reminder 1',
          event: testEvent._id,
          status: NotificationStatus.UNREAD
        },
        {
          user: testUser._id,
          type: NotificationType.REGISTRATION_CONFIRMED,
          title: 'Registration Confirmed',
          message: 'Test registration',
          event: testEvent._id,
          status: NotificationStatus.READ
        }
      ]);

      const response = await request(app)
        .get('/api/v1/notifications/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
    });

    it('should filter notifications by status', async () => {
      await Notification.create([
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Unread Notification',
          message: 'Unread',
          status: NotificationStatus.UNREAD
        },
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Read Notification',
          message: 'Read',
          status: NotificationStatus.READ
        }
      ]);

      const response = await request(app)
        .get('/api/v1/notifications/me?status=UNREAD')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.notifications[0].status).toBe('UNREAD');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/notifications/me')
        .expect(401);
    });
  });

  describe('GET /api/v1/notifications/unread/count', () => {
    it('should return unread notification count', async () => {
      await Notification.create([
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Unread 1',
          message: 'Unread',
          status: NotificationStatus.UNREAD
        },
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Unread 2',
          message: 'Unread',
          status: NotificationStatus.UNREAD
        },
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Read',
          message: 'Read',
          status: NotificationStatus.READ
        }
      ]);

      const response = await request(app)
        .get('/api/v1/notifications/unread/count')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notification = await Notification.create({
        user: testUser._id,
        type: NotificationType.EVENT_REMINDER,
        title: 'Test Notification',
        message: 'Test message',
        status: NotificationStatus.UNREAD
      });

      const response = await request(app)
        .patch(`/api/v1/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.status).toBe('READ');

      // Verify in database
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.status).toBe('READ');
      expect(updatedNotification.readAt).toBeDefined();
    });

    it('should prevent marking another user\'s notification', async () => {
      const notification = await Notification.create({
        user: testOrganizer._id,
        type: NotificationType.EVENT_REMINDER,
        title: 'Organizer Notification',
        message: 'Test',
        status: NotificationStatus.UNREAD
      });

      await request(app)
        .patch(`/api/v1/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .patch(`/api/v1/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('should mark all user notifications as read', async () => {
      await Notification.create([
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Unread 1',
          message: 'Unread',
          status: NotificationStatus.UNREAD
        },
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Unread 2',
          message: 'Unread',
          status: NotificationStatus.UNREAD
        },
        {
          user: testUser._id,
          type: NotificationType.EVENT_REMINDER,
          title: 'Already Read',
          message: 'Read',
          status: NotificationStatus.READ
        }
      ]);

      const response = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifiedCount).toBe(2);

      // Verify in database
      const unreadCount = await Notification.countDocuments({
        user: testUser._id,
        status: NotificationStatus.UNREAD
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should delete notification', async () => {
      const notification = await Notification.create({
        user: testUser._id,
        type: NotificationType.EVENT_REMINDER,
        title: 'Test Notification',
        message: 'Test message'
      });

      await request(app)
        .delete(`/api/v1/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // Verify deletion
      const deleted = await Notification.findById(notification._id);
      expect(deleted).toBeNull();
    });

    it('should prevent deleting another user\'s notification', async () => {
      const notification = await Notification.create({
        user: testOrganizer._id,
        type: NotificationType.EVENT_REMINDER,
        title: 'Organizer Notification',
        message: 'Test'
      });

      await request(app)
        .delete(`/api/v1/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/notifications/:id', () => {
    it('should retrieve notification by ID', async () => {
      const notification = await Notification.create({
        user: testUser._id,
        type: NotificationType.EVENT_REMINDER,
        title: 'Test Notification',
        message: 'Test message',
        event: testEvent._id
      });

      const response = await request(app)
        .get(`/api/v1/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.title).toBe('Test Notification');
    });

    it('should prevent accessing another user\'s notification', async () => {
      const notification = await Notification.create({
        user: testOrganizer._id,
        type: NotificationType.EVENT_REMINDER,
        title: 'Organizer Notification',
        message: 'Test'
      });

      await request(app)
        .get(`/api/v1/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);
    });
  });

  describe('Notification Creation Triggers', () => {
    it('should create notification when user registers for event', async () => {
      // Register user for event
      await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(201);

      // Wait a bit for async notification creation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if notification was created
      const notifications = await Notification.find({
        user: testUser._id,
        type: NotificationType.REGISTRATION_CONFIRMED
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });
});



