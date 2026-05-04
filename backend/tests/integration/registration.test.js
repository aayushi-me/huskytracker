/**
 * Registration Integration Tests
 * Tests the complete registration API endpoints with database operations
 */

const request = require('supertest');
const app = require('../../server');
const database = require('../../src/config/database');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Event, EventStatus } = require('../../src/models/Event');
const { EventRegistration, RegistrationStatus } = require('../../src/models/EventRegistration');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

let mongoServer;
let authToken;
let testUser;
let testOrganizer;
let testEvent;

// Helper function to generate auth token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

beforeAll(async () => {
  // Setup in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'test-secret';
  
  await database.connect();
});

afterAll(async () => {
  await database.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear database
  await User.deleteMany({});
  await Event.deleteMany({});
  await EventRegistration.deleteMany({});

  // Create test user
  testUser = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@northeastern.edu',
    password: 'Password123!',
    university: 'Northeastern University',
    role: 'STUDENT'
  });

  // Create test organizer
  testOrganizer = await User.create({
    firstName: 'Test',
    lastName: 'Organizer',
    email: 'organizer@northeastern.edu',
    password: 'Password123!',
    university: 'Northeastern University',
    role: 'ORGANIZER'
  });

  // Create test event
  testEvent = await Event.create({
    title: 'Test Event',
    description: 'This is a test event for registration testing',
    organizer: testOrganizer._id,
    category: 'Academic',
    status: EventStatus.PUBLISHED,
    startDate: new Date(Date.now() + 86400000), // Tomorrow
    endDate: new Date(Date.now() + 90000000), // Day after
    location: {
      name: 'Test Location',
      isVirtual: false
    },
    maxRegistrations: 50,
    currentRegistrations: 0
  });

  authToken = generateToken(testUser._id);
});

describe('Registration API Integration Tests', () => {
  
  describe('POST /api/v1/events/:id/register', () => {
    
    test('should successfully register user for event', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registration).toBeDefined();
      expect(response.body.data.status).toBe('REGISTERED');

      // Verify database state
      const registration = await EventRegistration.findOne({
        user: testUser._id,
        event: testEvent._id
      });
      expect(registration).toBeDefined();
      expect(registration.status).toBe(RegistrationStatus.REGISTERED);

      // Verify event registration count
      const updatedEvent = await Event.findById(testEvent._id);
      expect(updatedEvent.currentRegistrations).toBe(1);
    });

    test('should add user to waitlist when event is full', async () => {
      // Fill the event to capacity
      testEvent.currentRegistrations = 50;
      await testEvent.save();

      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('WAITLISTED');
      expect(response.body.data.waitlistPosition).toBe(1);

      // Verify database state
      const registration = await EventRegistration.findOne({
        user: testUser._id,
        event: testEvent._id
      });
      expect(registration.status).toBe(RegistrationStatus.WAITLISTED);
      expect(registration.waitlistPosition).toBe(1);
    });

    test('should reject duplicate registration', async () => {
      // Create existing registration
      await EventRegistration.create({
        user: testUser._id,
        event: testEvent._id,
        status: RegistrationStatus.REGISTERED
      });

      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already registered');
    });

    test('should reject registration without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject registration for non-existent event', async () => {
      const fakeEventId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .post(`/api/v1/events/${fakeEventId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should reject registration for cancelled event', async () => {
      testEvent.status = EventStatus.CANCELLED;
      await testEvent.save();

      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cancelled');
    });
  });

  describe('DELETE /api/v1/registrations/:id', () => {
    
    let testRegistration;

    beforeEach(async () => {
      // Create a registration
      testRegistration = await EventRegistration.create({
        user: testUser._id,
        event: testEvent._id,
        status: RegistrationStatus.REGISTERED
      });

      testEvent.currentRegistrations = 1;
      await testEvent.save();
    });

    test('should successfully cancel registration', async () => {
      const response = await request(app)
        .delete(`/api/v1/registrations/${testRegistration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');

      // Verify database state
      const updatedRegistration = await EventRegistration.findById(testRegistration._id);
      expect(updatedRegistration.status).toBe(RegistrationStatus.CANCELLED);

      // Verify event registration count
      const updatedEvent = await Event.findById(testEvent._id);
      expect(updatedEvent.currentRegistrations).toBe(0);
    });

    test('should promote waitlisted user when spot opens', async () => {
      // Create waitlisted user
      const waitlistedUser = await User.create({
        firstName: 'Waitlisted',
        lastName: 'User',
        email: 'waitlist@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT'
      });

      const waitlistRegistration = await EventRegistration.create({
        user: waitlistedUser._id,
        event: testEvent._id,
        status: RegistrationStatus.WAITLISTED,
        waitlistPosition: 1
      });

      testEvent.currentRegistrations = 50;
      testEvent.maxRegistrations = 50;
      await testEvent.save();

      // Cancel first registration
      const response = await request(app)
        .delete(`/api/v1/registrations/${testRegistration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify waitlisted user was promoted
      const promotedRegistration = await EventRegistration.findById(waitlistRegistration._id);
      expect(promotedRegistration.status).toBe(RegistrationStatus.REGISTERED);
      expect(promotedRegistration.waitlistPosition).toBeNull();
    });

    test('should reject cancellation by non-owner', async () => {
      const otherUser = await User.create({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT'
      });

      const otherToken = generateToken(otherUser._id);

      const response = await request(app)
        .delete(`/api/v1/registrations/${testRegistration._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('GET /api/v1/registrations/me', () => {
    
    beforeEach(async () => {
      // Create multiple registrations
      await EventRegistration.create([
        {
          user: testUser._id,
          event: testEvent._id,
          status: RegistrationStatus.REGISTERED
        },
        {
          user: testUser._id,
          event: testEvent._id,
          status: RegistrationStatus.CANCELLED
        }
      ]);
    });

    test('should return user registrations', async () => {
      const response = await request(app)
        .get('/api/v1/registrations/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registrations).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should filter registrations by status', async () => {
      const response = await request(app)
        .get('/api/v1/registrations/me?status=REGISTERED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const registrations = response.body.data.registrations;
      registrations.forEach(reg => {
        expect(reg.status).toBe(RegistrationStatus.REGISTERED);
      });
    });

    test('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/registrations/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/events/:id/attendees', () => {
    
    beforeEach(async () => {
      // Create registrations for the event
      await EventRegistration.create([
        {
          user: testUser._id,
          event: testEvent._id,
          status: RegistrationStatus.REGISTERED
        }
      ]);
    });

    test('should return attendees for organizer', async () => {
      const organizerToken = generateToken(testOrganizer._id);

      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/attendees`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attendees).toBeDefined();
      expect(Array.isArray(response.body.data.attendees)).toBe(true);
    });

    test('should reject non-organizer', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/attendees`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('organizer');
    });
  });

  describe('POST /api/v1/registrations/:id/attendance', () => {
    
    let testRegistration;

    beforeEach(async () => {
      // Create past event
      testEvent.endDate = new Date(Date.now() - 3600000); // 1 hour ago
      await testEvent.save();

      testRegistration = await EventRegistration.create({
        user: testUser._id,
        event: testEvent._id,
        status: RegistrationStatus.REGISTERED
      });
    });

    test('should mark attendance by organizer', async () => {
      const organizerToken = generateToken(testOrganizer._id);

      const response = await request(app)
        .post(`/api/v1/registrations/${testRegistration._id}/attendance`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ attended: true })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify database state
      const updatedRegistration = await EventRegistration.findById(testRegistration._id);
      expect(updatedRegistration.status).toBe(RegistrationStatus.ATTENDED);
      expect(updatedRegistration.attendedAt).toBeDefined();
    });

    test('should mark no-show by organizer', async () => {
      const organizerToken = generateToken(testOrganizer._id);

      const response = await request(app)
        .post(`/api/v1/registrations/${testRegistration._id}/attendance`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ attended: false })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify database state
      const updatedRegistration = await EventRegistration.findById(testRegistration._id);
      expect(updatedRegistration.status).toBe(RegistrationStatus.NO_SHOW);
    });

    test('should reject non-organizer', async () => {
      const response = await request(app)
        .post(`/api/v1/registrations/${testRegistration._id}/attendance`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ attended: true })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('organizer');
    });
  });

  describe('GET /api/v1/registrations/:id', () => {
    
    let testRegistration;

    beforeEach(async () => {
      testRegistration = await EventRegistration.create({
        user: testUser._id,
        event: testEvent._id,
        status: RegistrationStatus.REGISTERED
      });
    });

    test('should return registration details for owner', async () => {
      const response = await request(app)
        .get(`/api/v1/registrations/${testRegistration._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registration).toBeDefined();
      expect(response.body.data.registration._id).toBe(testRegistration._id.toString());
    });

    test('should return registration details for organizer', async () => {
      const organizerToken = generateToken(testOrganizer._id);

      const response = await request(app)
        .get(`/api/v1/registrations/${testRegistration._id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registration).toBeDefined();
    });

    test('should reject unauthorized user', async () => {
      const otherUser = await User.create({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@northeastern.edu',
        password: 'Password123!',
        university: 'Northeastern University',
        role: 'STUDENT'
      });

      const otherToken = generateToken(otherUser._id);

      const response = await request(app)
        .get(`/api/v1/registrations/${testRegistration._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('GET /api/v1/events/:id/eligibility', () => {
    
    test('should return eligible when user can register', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/eligibility`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.hasCapacity).toBe(true);
    });

    test('should return not eligible when already registered', async () => {
      await EventRegistration.create({
        user: testUser._id,
        event: testEvent._id,
        status: RegistrationStatus.REGISTERED
      });

      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/eligibility`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.reason).toContain('Already registered');
    });

    test('should indicate waitlist when event is full', async () => {
      testEvent.currentRegistrations = 50;
      await testEvent.save();

      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/eligibility`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.hasCapacity).toBe(false);
      expect(response.body.data.willBeWaitlisted).toBe(true);
    });
  });

  describe('GET /api/v1/events/:id/registration-stats', () => {
    
    beforeEach(async () => {
      await EventRegistration.create([
        {
          user: testUser._id,
          event: testEvent._id,
          status: RegistrationStatus.REGISTERED
        }
      ]);
    });

    test('should return statistics for organizer', async () => {
      const organizerToken = generateToken(testOrganizer._id);

      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/registration-stats`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.registered).toBeDefined();
      expect(response.body.data.capacity).toBeDefined();
    });

    test('should reject non-organizer', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/registration-stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('organizer');
    });
  });
});

