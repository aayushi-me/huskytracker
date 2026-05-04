/**
 * Integration Tests for Comment API
 * Tests HTTP endpoints for comment operations
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const User = require('../../src/models/User');
const { Event, EventStatus } = require('../../src/models/Event');
const { EventRegistration, RegistrationStatus } = require('../../src/models/EventRegistration');
const { Comment } = require('../../src/models/Comment');
const { generateAccessToken } = require('../../src/utils/jwt');

let mongoServer;
let studentToken;
let organizerToken;
let adminToken;
let studentUser;
let organizerUser;
let adminUser;
let testEvent;
let testRegistration;

beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await User.deleteMany({});
  await Event.deleteMany({});
  await EventRegistration.deleteMany({});
  await Comment.deleteMany({});

  // Create test users
  studentUser = await User.create({
    firstName: 'John',
    lastName: 'Doe',
    email: 'student@test.com',
    password: 'password123',
    university: 'Test University',
    role: 'STUDENT'
  });

  organizerUser = await User.create({
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'organizer@test.com',
    password: 'password123',
    university: 'Test University',
    role: 'ORGANIZER'
  });

  adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    password: 'password123',
    university: 'Test University',
    role: 'ADMIN'
  });

  // Generate tokens
  studentToken = generateAccessToken({ id: studentUser._id, role: studentUser.role });
  organizerToken = generateAccessToken({ id: organizerUser._id, role: organizerUser.role });
  adminToken = generateAccessToken({ id: adminUser._id, role: adminUser.role });

  // Create past test event
  testEvent = await Event.create({
    title: 'Past Test Event',
    description: 'This is a past test event',
    organizer: organizerUser._id,
    category: 'Academic',
    status: EventStatus.COMPLETED,
    startDate: new Date(Date.now() - 172800000), // 2 days ago
    endDate: new Date(Date.now() - 86400000), // 1 day ago
    location: {
      name: 'Test Location',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345'
    },
    maxRegistrations: 100
  });

  // Create attended registration for student
  testRegistration = await EventRegistration.create({
    user: studentUser._id,
    event: testEvent._id,
    status: RegistrationStatus.ATTENDED,
    registeredAt: new Date(Date.now() - 172800000),
    attendedAt: new Date(Date.now() - 86400000)
  });
});

describe('Comment API Integration Tests', () => {

  describe('POST /api/v1/events/:id/comments', () => {
    it('should create comment for user who attended event', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          content: 'Great event! Learned a lot.',
          rating: 5
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment).toBeDefined();
      expect(response.body.data.comment.content).toBe('Great event! Learned a lot.');
      expect(response.body.data.comment.rating).toBe(5);
    });

    it('should reject comment from user who did not attend', async () => {
      // Create another user who didn't attend
      const nonAttendeeUser = await User.create({
        firstName: 'Non',
        lastName: 'Attendee',
        email: 'nonattendee@test.com',
        password: 'password123',
        university: 'Test University',
        role: 'STUDENT'
      });

      const nonAttendeeToken = generateAccessToken({ 
        id: nonAttendeeUser._id, 
        role: nonAttendeeUser.role 
      });

      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/comments`)
        .set('Authorization', `Bearer ${nonAttendeeToken}`)
        .send({
          content: 'Trying to comment',
          rating: 5
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject comment without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/comments`)
        .send({
          content: 'Test comment',
          rating: 5
        });

      expect(response.status).toBe(401);
    });

    it('should reject comment with invalid rating', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          content: 'Test comment',
          rating: 10
        });

      expect(response.status).toBe(400);
    });

    it('should reject comment with empty content', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          content: '',
          rating: 5
        });

      expect(response.status).toBe(400);
    });

    it('should create comment without rating', async () => {
      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          content: 'Comment without rating'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.comment.content).toBe('Comment without rating');
      expect(response.body.data.comment.rating).toBeNull();
    });
  });

  describe('GET /api/v1/events/:id/comments', () => {
    beforeEach(async () => {
      // Create multiple comments for testing
      await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'First comment',
        rating: 5
      });

      await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Second comment',
        rating: 3
      });
    });

    it('should get all comments for an event', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/comments`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toBeDefined();
      expect(response.body.data.comments.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/comments`)
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.comments.length).toBe(1);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.totalPages).toBeGreaterThan(0);
    });

    it('should support sorting by newest', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/comments`)
        .query({ sort: 'newest' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toBeDefined();
    });

    it('should support sorting by highest rated', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/comments`)
        .query({ sort: 'highest_rated' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toBeDefined();
    });
  });

  describe('PUT /api/v1/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Original comment',
        rating: 4
      });
    });

    it('should update comment by author', async () => {
      const response = await request(app)
        .put(`/api/v1/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          content: 'Updated comment',
          rating: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment.content).toBe('Updated comment');
      expect(response.body.data.comment.rating).toBe(5);
    });

    it('should reject update by non-author', async () => {
      const response = await request(app)
        .put(`/api/v1/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          content: 'Trying to update'
        });

      expect(response.status).toBe(403);
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/comments/${testComment._id}`)
        .send({
          content: 'Updated comment'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Comment to delete',
        rating: 3
      });
    });

    it('should delete comment by author', async () => {
      const response = await request(app)
        .delete(`/api/v1/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(204);
    });

    it('should delete comment by admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);
    });

    it('should reject delete by non-author non-moderator', async () => {
      const response = await request(app)
        .delete(`/api/v1/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/comments/:id/flag', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Comment to flag',
        rating: 3
      });
    });

    it('should flag comment with valid reason', async () => {
      const response = await request(app)
        .post(`/api/v1/comments/${testComment._id}/flag`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          reason: 'spam'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject flagging own comment', async () => {
      const response = await request(app)
        .post(`/api/v1/comments/${testComment._id}/flag`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: 'spam'
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid flag reason', async () => {
      const response = await request(app)
        .post(`/api/v1/comments/${testComment._id}/flag`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          reason: 'invalid_reason'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/comments/flagged', () => {
    beforeEach(async () => {
      // Create flagged comment
      await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Flagged comment',
        rating: 3,
        isFlagged: true,
        flagReason: 'spam',
        flaggedBy: organizerUser._id,
        flaggedAt: new Date()
      });
    });

    it('should return flagged comments for admin', async () => {
      const response = await request(app)
        .get('/api/v1/comments/flagged')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toBeDefined();
    });

    it('should reject access for non-moderator', async () => {
      const response = await request(app)
        .get('/api/v1/comments/flagged')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/comments/:id/unflag', () => {
    let flaggedComment;

    beforeEach(async () => {
      flaggedComment = await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Flagged comment',
        rating: 3,
        isFlagged: true,
        flagReason: 'spam',
        flaggedBy: organizerUser._id,
        flaggedAt: new Date()
      });
    });

    it('should unflag comment by admin', async () => {
      const response = await request(app)
        .post(`/api/v1/comments/${flaggedComment._id}/unflag`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject unflag by non-moderator', async () => {
      const response = await request(app)
        .post(`/api/v1/comments/${flaggedComment._id}/unflag`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/events/:id/comments/stats', () => {
    beforeEach(async () => {
      await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Comment 1',
        rating: 5
      });

      await Comment.create({
        user: studentUser._id,
        event: testEvent._id,
        content: 'Comment 2',
        rating: 4
      });
    });

    it('should return comment statistics for event', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/comments/stats`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.averageRating).toBeDefined();
      expect(response.body.data.totalComments).toBeDefined();
    });
  });
});

