/**
 * Unit Tests for Comment Service
 * Tests business logic for comment operations
 */

const commentService = require('../../src/services/commentService');
const commentRepository = require('../../src/repositories/commentRepository');
const eventRegistrationRepository = require('../../src/repositories/eventRegistrationRepository');
const eventRepository = require('../../src/repositories/eventRepository');
const { Notification } = require('../../src/models/Notification');
const { RegistrationStatus } = require('../../src/models/EventRegistration');
const { EventStatus } = require('../../src/models/Event');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError
} = require('../../src/utils/errors');

// Mock dependencies
jest.mock('../../src/repositories/commentRepository');
jest.mock('../../src/repositories/eventRegistrationRepository');
jest.mock('../../src/repositories/eventRepository');
jest.mock('../../src/models/Notification');
jest.mock('../../src/models/User');

describe('CommentService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyAttendance', () => {
    it('should return true for user who attended event', async () => {
      const userId = 'user123';
      const eventId = 'event123';
      
      eventRepository.findById.mockResolvedValue({
        _id: eventId,
        endDate: new Date(Date.now() - 86400000) // 1 day ago
      });

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue({
        user: userId,
        event: eventId,
        status: RegistrationStatus.ATTENDED
      });

      const result = await commentService.verifyAttendance(userId, eventId);
      
      expect(result).toBe(true);
    });

    it('should return false for user who did not attend', async () => {
      const userId = 'user123';
      const eventId = 'event123';
      
      eventRepository.findById.mockResolvedValue({
        _id: eventId,
        endDate: new Date(Date.now() - 86400000)
      });

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue({
        user: userId,
        event: eventId,
        status: RegistrationStatus.REGISTERED
      });

      const result = await commentService.verifyAttendance(userId, eventId);
      
      expect(result).toBe(false);
    });

    it('should return false for event that has not ended', async () => {
      const userId = 'user123';
      const eventId = 'event123';
      
      eventRepository.findById.mockResolvedValue({
        _id: eventId,
        endDate: new Date(Date.now() + 86400000) // 1 day in future
      });

      const result = await commentService.verifyAttendance(userId, eventId);
      
      expect(result).toBe(false);
    });

    it('should throw NotFoundError if event does not exist', async () => {
      eventRepository.findById.mockResolvedValue(null);

      await expect(
        commentService.verifyAttendance('user123', 'event123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateRating', () => {
    it('should not throw for valid rating', () => {
      expect(() => commentService.validateRating(3)).not.toThrow();
      expect(() => commentService.validateRating(1)).not.toThrow();
      expect(() => commentService.validateRating(5)).not.toThrow();
    });

    it('should not throw for null or undefined rating', () => {
      expect(() => commentService.validateRating(null)).not.toThrow();
      expect(() => commentService.validateRating(undefined)).not.toThrow();
    });

    it('should throw BadRequestError for rating below 1', () => {
      expect(() => commentService.validateRating(0)).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for rating above 5', () => {
      expect(() => commentService.validateRating(6)).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for non-integer rating', () => {
      expect(() => commentService.validateRating(3.5)).toThrow(BadRequestError);
    });
  });

  describe('validateContent', () => {
    it('should not throw for valid content', () => {
      expect(() => commentService.validateContent('Great event!')).not.toThrow();
    });

    it('should throw BadRequestError for empty content', () => {
      expect(() => commentService.validateContent('')).toThrow(BadRequestError);
      expect(() => commentService.validateContent('   ')).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for content exceeding 2000 characters', () => {
      const longContent = 'a'.repeat(2001);
      expect(() => commentService.validateContent(longContent)).toThrow(BadRequestError);
    });
  });

  describe('createComment', () => {
    it('should create comment for user who attended event', async () => {
      const userId = 'user123';
      const eventId = 'event123';
      const commentData = {
        content: 'Great event!',
        rating: 5
      };

      eventRepository.findById.mockResolvedValue({
        _id: eventId,
        endDate: new Date(Date.now() - 86400000)
      });

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue({
        status: RegistrationStatus.ATTENDED
      });

      commentRepository.findByUser.mockResolvedValue([]);

      commentRepository.create.mockResolvedValue({
        _id: 'comment123',
        user: userId,
        event: eventId,
        content: 'Great event!',
        rating: 5
      });

      commentRepository.findById.mockResolvedValue({
        _id: 'comment123',
        user: { _id: userId, firstName: 'John', lastName: 'Doe' },
        event: { _id: eventId, title: 'Test Event' },
        content: 'Great event!',
        rating: 5
      });

      const result = await commentService.createComment(userId, eventId, commentData);

      expect(result).toBeDefined();
      expect(commentRepository.create).toHaveBeenCalledWith({
        user: userId,
        event: eventId,
        content: 'Great event!',
        rating: 5
      });
    });

    it('should throw ForbiddenError for user who did not attend', async () => {
      const userId = 'user123';
      const eventId = 'event123';
      
      eventRepository.findById.mockResolvedValue({
        _id: eventId,
        endDate: new Date(Date.now() - 86400000)
      });

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue({
        status: RegistrationStatus.REGISTERED
      });

      await expect(
        commentService.createComment(userId, eventId, { content: 'Test', rating: 5 })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError for invalid rating', async () => {
      await expect(
        commentService.createComment('user123', 'event123', { content: 'Test', rating: 10 })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if user already commented', async () => {
      const userId = 'user123';
      const eventId = 'event123';

      eventRepository.findById.mockResolvedValue({
        _id: eventId,
        endDate: new Date(Date.now() - 86400000)
      });

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue({
        status: RegistrationStatus.ATTENDED
      });

      commentRepository.findByUser.mockResolvedValue([
        { event: { _id: eventId } }
      ]);

      await expect(
        commentService.createComment(userId, eventId, { content: 'Test', rating: 5 })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('updateComment', () => {
    it('should update comment by author', async () => {
      const commentId = 'comment123';
      const userId = 'user123';
      const updateData = { content: 'Updated content', rating: 4 };

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: userId },
        content: 'Original content',
        rating: 5
      });

      commentRepository.update.mockResolvedValue({
        _id: commentId,
        content: 'Updated content',
        rating: 4
      });

      commentRepository.findById.mockResolvedValueOnce({
        _id: commentId,
        user: { _id: userId },
        content: 'Original content',
        rating: 5
      }).mockResolvedValueOnce({
        _id: commentId,
        user: { _id: userId },
        content: 'Updated content',
        rating: 4
      });

      const result = await commentService.updateComment(commentId, userId, updateData);

      expect(result).toBeDefined();
      expect(commentRepository.update).toHaveBeenCalledWith(commentId, {
        content: 'Updated content',
        rating: 4
      });
    });

    it('should throw ForbiddenError if user is not author', async () => {
      const commentId = 'comment123';
      const userId = 'user123';
      const otherUserId = 'user456';

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: otherUserId }
      });

      await expect(
        commentService.updateComment(commentId, userId, { content: 'Updated' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError if comment does not exist', async () => {
      commentRepository.findById.mockResolvedValue(null);

      await expect(
        commentService.updateComment('comment123', 'user123', { content: 'Updated' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment by author', async () => {
      const commentId = 'comment123';
      const userId = 'user123';

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: userId }
      });

      commentRepository.delete.mockResolvedValue({
        _id: commentId,
        isDeleted: true
      });

      await commentService.deleteComment(commentId, userId, 'STUDENT');

      expect(commentRepository.delete).toHaveBeenCalledWith(commentId);
    });

    it('should delete comment by moderator', async () => {
      const commentId = 'comment123';
      const userId = 'moderator123';
      const authorId = 'user123';

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: authorId }
      });

      commentRepository.delete.mockResolvedValue({
        _id: commentId,
        isDeleted: true
      });

      await commentService.deleteComment(commentId, userId, 'ADMIN');

      expect(commentRepository.delete).toHaveBeenCalledWith(commentId);
    });

    it('should throw ForbiddenError if user is neither author nor moderator', async () => {
      const commentId = 'comment123';
      const userId = 'user456';
      const authorId = 'user123';

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: authorId }
      });

      await expect(
        commentService.deleteComment(commentId, userId, 'STUDENT')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('flagComment', () => {
    it('should flag comment with valid reason', async () => {
      const commentId = 'comment123';
      const userId = 'user456';
      const authorId = 'user123';
      const reason = 'spam';

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: authorId },
        event: { _id: 'event123', title: 'Test Event' }
      });

      commentRepository.flag.mockResolvedValue({
        _id: commentId,
        isFlagged: true,
        flagReason: reason
      });

      const result = await commentService.flagComment(commentId, userId, reason);

      expect(result).toBeDefined();
      expect(commentRepository.flag).toHaveBeenCalledWith(commentId, userId, reason);
    });

    it('should throw BadRequestError if user tries to flag own comment', async () => {
      const commentId = 'comment123';
      const userId = 'user123';

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: userId }
      });

      await expect(
        commentService.flagComment(commentId, userId, 'spam')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid reason', async () => {
      const commentId = 'comment123';
      const userId = 'user456';

      commentRepository.findById.mockResolvedValue({
        _id: commentId,
        user: { _id: 'user123' }
      });

      await expect(
        commentService.flagComment(commentId, userId, 'invalid_reason')
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getFlaggedComments', () => {
    it('should return flagged comments for moderator', async () => {
      const mockFlaggedComments = {
        comments: [
          { _id: 'comment1', isFlagged: true, flagReason: 'spam' },
          { _id: 'comment2', isFlagged: true, flagReason: 'inappropriate' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 1,
          totalCount: 2
        }
      };

      commentRepository.findFlagged.mockResolvedValue(mockFlaggedComments);

      const result = await commentService.getFlaggedComments('ADMIN', { page: 1, limit: 20 });

      expect(result).toEqual(mockFlaggedComments);
    });

    it('should throw ForbiddenError for non-moderator', async () => {
      await expect(
        commentService.getFlaggedComments('STUDENT', {})
      ).rejects.toThrow(ForbiddenError);
    });
  });
});

