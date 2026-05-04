/**
 * Event API Integration Tests
 * Tests all event endpoints with authentication and authorization
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const User = require('../../src/models/User');
const { Event, EventStatus } = require('../../src/models/Event');
const jwt = require('jsonwebtoken');

let mongoServer;
let studentToken, organizerToken, adminToken;
let studentUser, organizerUser, adminUser;
let testEvent;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Create test users
  studentUser = await User.create({
    firstName: 'Student',
    lastName: 'User',
    email: 'student@northeastern.edu',
    password: 'Password123!',
    role: 'STUDENT'
  });
  
  organizerUser = await User.create({
    firstName: 'Organizer',
    lastName: 'User',
    email: 'organizer@northeastern.edu',
    password: 'Password123!',
    role: 'ORGANIZER'
  });
  
  adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@northeastern.edu',
    password: 'Password123!',
    role: 'ADMIN'
  });
  
  // Generate tokens
  studentToken = jwt.sign(
    { id: studentUser._id, role: studentUser.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  organizerToken = jwt.sign(
    { id: organizerUser._id, role: organizerUser.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  adminToken = jwt.sign(
    { id: adminUser._id, role: adminUser.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Event.deleteMany({});
});

describe('POST /api/v1/events - Create Event', () => {
  const validEventData = {
    title: 'Test Event',
    description: 'This is a comprehensive test event description with enough detail',
    category: 'Academic',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    location: {
      name: 'Snell Library',
      address: '360 Huntington Ave',
      city: 'Boston',
      state: 'MA',
      zipCode: '02115',
      isVirtual: false
    },
    maxRegistrations: 100,
    tags: ['test', 'academic'],
    isPublic: true
  };

  test('should create event as organizer', async () => {
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(validEventData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.event).toBeDefined();
    expect(response.body.data.event.title).toBe(validEventData.title);
    expect(response.body.data.event.status).toBe(EventStatus.DRAFT);
    expect(response.body.data.event.organizer._id).toBe(organizerUser._id.toString());
  });

  test('should create event as admin', async () => {
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validEventData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.event).toBeDefined();
  });

  test('should reject event creation by student', async () => {
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(validEventData)
      .expect(403);

    expect(response.body.success).toBe(false);
  });

  test('should reject unauthenticated event creation', async () => {
    await request(app)
      .post('/api/v1/events')
      .send(validEventData)
      .expect(401);
  });

  test('should reject event with missing required fields', async () => {
    const invalidData = { title: 'Test' };
    
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toBeDefined();
  });

  test('should reject event with invalid date range', async () => {
    const invalidData = {
      ...validEventData,
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('should reject event with past start date', async () => {
    const invalidData = {
      ...validEventData,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(invalidData)
      .expect(400);
  });
});

describe('GET /api/v1/events - List Events', () => {
  beforeEach(async () => {
    // Create test events
    await Event.create({
      title: 'Published Event 1',
      description: 'This is a published event with enough description text',
      category: 'Academic',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' },
      isPublic: true
    });

    await Event.create({
      title: 'Published Event 2',
      description: 'This is another published event with description',
      category: 'Career',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location 2' },
      isPublic: true
    });

    await Event.create({
      title: 'Draft Event',
      description: 'This is a draft event that should not appear',
      category: 'Academic',
      status: EventStatus.DRAFT,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' },
      isPublic: true
    });
  });

  test('should return only published events for unauthenticated users', async () => {
    const response = await request(app)
      .get('/api/v1/events')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.events).toBeDefined();
    expect(response.body.data.events.length).toBe(2);
    expect(response.body.data.events.every(e => e.status === EventStatus.PUBLISHED)).toBe(true);
  });

  test('should return only published events for students', async () => {
    const response = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body.data.events.length).toBe(2);
  });

  test('should support pagination', async () => {
    const response = await request(app)
      .get('/api/v1/events?page=1&limit=1')
      .expect(200);

    expect(response.body.data.events.length).toBe(1);
    expect(response.body.data.pagination).toBeDefined();
    expect(response.body.data.pagination.currentPage).toBe(1);
    expect(response.body.data.pagination.limit).toBe(1);
  });

  test('should filter by category', async () => {
    const response = await request(app)
      .get('/api/v1/events?category=Academic')
      .expect(200);

    expect(response.body.data.events.length).toBe(1);
    expect(response.body.data.events[0].category).toBe('Academic');
  });

  test('should return empty array when no published events exist', async () => {
    await Event.deleteMany({});

    const response = await request(app)
      .get('/api/v1/events')
      .expect(200);

    expect(response.body.data.events).toEqual([]);
  });
});

describe('GET /api/v1/events/:id - Get Event Details', () => {
  let publishedEvent, draftEvent;

  beforeEach(async () => {
    publishedEvent = await Event.create({
      title: 'Published Event',
      description: 'This is a published event with proper description',
      category: 'Academic',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' },
      isPublic: true
    });

    draftEvent = await Event.create({
      title: 'Draft Event',
      description: 'This is a draft event with proper description',
      category: 'Academic',
      status: EventStatus.DRAFT,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' },
      isPublic: true
    });
  });

  test('should return published event for unauthenticated users', async () => {
    const response = await request(app)
      .get(`/api/v1/events/${publishedEvent._id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.event.title).toBe(publishedEvent.title);
  });

  test('should return 404 for non-existent event', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    await request(app)
      .get(`/api/v1/events/${fakeId}`)
      .expect(404);
  });

  test('should return draft event for organizer', async () => {
    const response = await request(app)
      .get(`/api/v1/events/${draftEvent._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    expect(response.body.data.event.status).toBe(EventStatus.DRAFT);
  });

  test('should deny draft event access to non-organizer', async () => {
    await request(app)
      .get(`/api/v1/events/${draftEvent._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});

describe('PUT /api/v1/events/:id - Update Event', () => {
  let event;

  beforeEach(async () => {
    event = await Event.create({
      title: 'Original Event',
      description: 'This is the original event description',
      category: 'Academic',
      status: EventStatus.DRAFT,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' },
      maxRegistrations: 100,
      currentRegistrations: 0
    });
  });

  test('should update event as organizer', async () => {
    const updateData = { title: 'Updated Event Title' };

    const response = await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.event.title).toBe(updateData.title);
  });

  test('should update event status via PUT endpoint', async () => {
    const response = await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ status: EventStatus.PUBLISHED })
      .expect(200);

    expect(response.body.data.event.status).toBe(EventStatus.PUBLISHED);
  });

  test('should reject status update with invalid transition', async () => {
    await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ status: EventStatus.COMPLETED })
      .expect(400);
  });

  test('should update event as admin', async () => {
    const response = await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin Updated Title' })
      .expect(200);

    expect(response.body.data.event.title).toBe('Admin Updated Title');
  });

  test('should reject update by non-organizer', async () => {
    await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Unauthorized Update' })
      .expect(403);
  });

  test('should reject capacity reduction below current registrations', async () => {
    event.currentRegistrations = 50;
    await event.save();

    await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ maxRegistrations: 30 })
      .expect(400);
  });

  test('should reject update of completed event', async () => {
    event.status = EventStatus.COMPLETED;
    await event.save();

    await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Updated Title' })
      .expect(400);
  });
});

describe('DELETE /api/v1/events/:id - Delete Event', () => {
  let eventWithoutRegistrations, eventWithRegistrations;

  beforeEach(async () => {
    eventWithoutRegistrations = await Event.create({
      title: 'Event Without Registrations',
      description: 'This event has no registrations',
      category: 'Academic',
      status: EventStatus.DRAFT,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' },
      currentRegistrations: 0
    });

    eventWithRegistrations = await Event.create({
      title: 'Event With Registrations',
      description: 'This event has registrations',
      category: 'Academic',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' },
      currentRegistrations: 10
    });
  });

  test('should hard delete event without registrations', async () => {
    const response = await request(app)
      .delete(`/api/v1/events/${eventWithoutRegistrations._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    expect(response.body.deleted).toBe(true);
    expect(response.body.cancelled).toBe(false);

    const deletedEvent = await Event.findById(eventWithoutRegistrations._id);
    expect(deletedEvent).toBeNull();
  });

  test('should soft delete event with registrations', async () => {
    const response = await request(app)
      .delete(`/api/v1/events/${eventWithRegistrations._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    expect(response.body.deleted).toBe(false);
    expect(response.body.cancelled).toBe(true);

    const cancelledEvent = await Event.findById(eventWithRegistrations._id);
    expect(cancelledEvent.status).toBe(EventStatus.CANCELLED);
  });

  test('should reject deletion by non-organizer', async () => {
    await request(app)
      .delete(`/api/v1/events/${eventWithoutRegistrations._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  test('should allow admin to delete any event', async () => {
    const response = await request(app)
      .delete(`/api/v1/events/${eventWithoutRegistrations._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.deleted).toBe(true);
  });
});

describe('GET /api/v1/events/search - Search Events', () => {
  beforeEach(async () => {
    await Event.create({
      title: 'JavaScript Workshop',
      description: 'Learn JavaScript fundamentals and advanced concepts',
      category: 'Academic',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Richards Hall' },
      isPublic: true,
      currentRegistrations: 25
    });

    await Event.create({
      title: 'Python Programming',
      description: 'Introduction to Python programming for beginners',
      category: 'Academic',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Snell Library' },
      isPublic: true,
      currentRegistrations: 50
    });

    await Event.create({
      title: 'Career Fair',
      description: 'Annual career fair with top companies',
      category: 'Career',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      location: { name: 'Curry Center' },
      isPublic: true,
      currentRegistrations: 100
    });
  });

  test('should search events by keyword', async () => {
    const response = await request(app)
      .get('/api/v1/events/search?q=JavaScript')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.events.length).toBeGreaterThan(0);
    expect(response.body.data.events[0].title).toContain('JavaScript');
  });

  test('should require search query', async () => {
    await request(app)
      .get('/api/v1/events/search')
      .expect(400);
  });

  test('should filter search results by category', async () => {
    const response = await request(app)
      .get('/api/v1/events/search?q=Programming&category=Academic')
      .expect(200);

    expect(response.body.data.events.every(e => e.category === 'Academic')).toBe(true);
  });

  test('should filter by date range', async () => {
    const startDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await request(app)
      .get(`/api/v1/events/search?q=Programming&startDate=${startDate}&endDate=${endDate}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    response.body.data.events.forEach(event => {
      const eventStart = new Date(event.startDate);
      expect(eventStart.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
      const eventEnd = new Date(event.endDate);
      expect(eventEnd.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
    });
  });

  test('should combine multiple filters', async () => {
    const startDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await request(app)
      .get(`/api/v1/events/search?q=Programming&category=Academic&startDate=${startDate}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    response.body.data.events.forEach(event => {
      expect(event.category).toBe('Academic');
      const eventStart = new Date(event.startDate);
      expect(eventStart.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
    });
  });

  test('should sort by date ascending', async () => {
    const response = await request(app)
      .get('/api/v1/events/search?q=Programming&sort=startDate')
      .expect(200);

    const dates = response.body.data.events.map(e => new Date(e.startDate).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  test('should sort by date descending', async () => {
    const response = await request(app)
      .get('/api/v1/events/search?q=Programming&sort=-startDate')
      .expect(200);

    const dates = response.body.data.events.map(e => new Date(e.startDate).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  test('should sort by popularity', async () => {
    const response = await request(app)
      .get('/api/v1/events/search?q=Programming&sort=popularity')
      .expect(200);

    const registrations = response.body.data.events.map(e => e.currentRegistrations);
    for (let i = 1; i < registrations.length; i++) {
      expect(registrations[i]).toBeLessThanOrEqual(registrations[i - 1]);
    }
  });

  test('should return empty array for no matches', async () => {
    const response = await request(app)
      .get('/api/v1/events/search?q=NonexistentKeyword123')
      .expect(200);

    expect(response.body.data.events).toEqual([]);
  });
});

describe('POST /api/v1/events/:id/publish - Publish Event', () => {
  let draftEvent, incompleteEvent;

  beforeEach(async () => {
    draftEvent = await Event.create({
      title: 'Complete Draft Event',
      description: 'This is a complete draft event ready to publish',
      category: 'Academic',
      status: EventStatus.DRAFT,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' }
    });

    incompleteEvent = await Event.create({
      title: 'Incomplete Draft',
      status: EventStatus.DRAFT,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' }
    });
  });

  test('should publish valid draft event', async () => {
    const response = await request(app)
      .post(`/api/v1/events/${draftEvent._id}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.event.status).toBe(EventStatus.PUBLISHED);
  });

  test('should reject publishing incomplete event', async () => {
    await request(app)
      .post(`/api/v1/events/${incompleteEvent._id}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(400);
  });

  test('should reject publishing already published event', async () => {
    draftEvent.status = EventStatus.PUBLISHED;
    await draftEvent.save();

    await request(app)
      .post(`/api/v1/events/${draftEvent._id}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(400);
  });

  test('should reject publishing by non-organizer', async () => {
    await request(app)
      .post(`/api/v1/events/${draftEvent._id}/publish`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});

describe('POST /api/v1/events/:id/cancel - Cancel Event', () => {
  let publishedEvent, completedEvent;

  beforeEach(async () => {
    publishedEvent = await Event.create({
      title: 'Published Event',
      description: 'This is a published event',
      category: 'Academic',
      status: EventStatus.PUBLISHED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' }
    });

    completedEvent = await Event.create({
      title: 'Completed Event',
      description: 'This is a completed event',
      category: 'Academic',
      status: EventStatus.COMPLETED,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' }
    });
  });

  test('should cancel published event', async () => {
    const response = await request(app)
      .post(`/api/v1/events/${publishedEvent._id}/cancel`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.event.status).toBe(EventStatus.CANCELLED);
  });

  test('should reject cancelling completed event', async () => {
    await request(app)
      .post(`/api/v1/events/${completedEvent._id}/cancel`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(400);
  });

  test('should reject cancelling already cancelled event', async () => {
    publishedEvent.status = EventStatus.CANCELLED;
    await publishedEvent.save();

    await request(app)
      .post(`/api/v1/events/${publishedEvent._id}/cancel`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(400);
  });

  test('should reject cancelling by non-organizer', async () => {
    await request(app)
      .post(`/api/v1/events/${publishedEvent._id}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});

describe('GET /api/v1/events/my/events - Get Organizer Events', () => {
  beforeEach(async () => {
    await Event.create([
      {
        title: 'Organizer Event 1',
        description: 'Event by organizer',
        category: 'Academic',
        status: EventStatus.PUBLISHED,
        organizer: organizerUser._id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: { name: 'Test Location' }
      },
      {
        title: 'Organizer Event 2',
        description: 'Another event by organizer',
        category: 'Career',
        status: EventStatus.DRAFT,
        organizer: organizerUser._id,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: { name: 'Test Location' }
      },
      {
        title: 'Admin Event',
        description: 'Event by admin',
        category: 'Academic',
        status: EventStatus.PUBLISHED,
        organizer: adminUser._id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: { name: 'Test Location' }
      }
    ]);
  });

  test('should return only organizer\'s events', async () => {
    const response = await request(app)
      .get('/api/v1/events/my/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.events.length).toBe(2);
    expect(response.body.data.events.every(e => 
      e.organizer._id === organizerUser._id.toString()
    )).toBe(true);
  });

  test('should include all statuses for organizer', async () => {
    const response = await request(app)
      .get('/api/v1/events/my/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    const statuses = response.body.data.events.map(e => e.status);
    expect(statuses).toContain(EventStatus.PUBLISHED);
    expect(statuses).toContain(EventStatus.DRAFT);
  });

  test('should reject request from student', async () => {
    await request(app)
      .get('/api/v1/events/my/events')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  test('should require authentication', async () => {
    await request(app)
      .get('/api/v1/events/my/events')
      .expect(401);
  });
});

describe('GET /api/v1/organizer/events/drafts - Get Organizer Draft Events', () => {
  beforeEach(async () => {
    await Event.create([
      {
        title: 'Draft Event 1',
        description: 'First draft event',
        category: 'Academic',
        status: EventStatus.DRAFT,
        organizer: organizerUser._id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: { name: 'Test Location' }
      },
      {
        title: 'Draft Event 2',
        description: 'Second draft event',
        category: 'Career',
        status: EventStatus.DRAFT,
        organizer: organizerUser._id,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: { name: 'Test Location' }
      },
      {
        title: 'Published Event',
        description: 'Published event',
        category: 'Academic',
        status: EventStatus.PUBLISHED,
        organizer: organizerUser._id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: { name: 'Test Location' }
      }
    ]);
  });

  test('should return only draft events', async () => {
    const response = await request(app)
      .get('/api/v1/organizer/events/drafts')
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.events.length).toBe(2);
    expect(response.body.data.events.every(e => e.status === EventStatus.DRAFT)).toBe(true);
  });

  test('should require authentication', async () => {
    await request(app)
      .get('/api/v1/organizer/events/drafts')
      .expect(401);
  });

  test('should reject request from student', async () => {
    await request(app)
      .get('/api/v1/organizer/events/drafts')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});

describe('Authorization Tests', () => {
  let event;

  beforeEach(async () => {
    event = await Event.create({
      title: 'Test Event',
      description: 'This is a test event',
      category: 'Academic',
      status: EventStatus.DRAFT,
      organizer: organizerUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' }
    });
  });

  test('admin can update any event', async () => {
    const response = await request(app)
      .put(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin Updated' })
      .expect(200);

    expect(response.body.data.event.title).toBe('Admin Updated');
  });

  test('admin can delete any event', async () => {
    const response = await request(app)
      .delete(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  test('organizer cannot update another organizer\'s event', async () => {
    const otherOrganizerEvent = await Event.create({
      title: 'Other Event',
      description: 'Event by another organizer',
      category: 'Academic',
      status: EventStatus.DRAFT,
      organizer: adminUser._id,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: { name: 'Test Location' }
    });

    await request(app)
      .put(`/api/v1/events/${otherOrganizerEvent._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Unauthorized Update' })
      .expect(403);
  });
});

module.exports = {};

