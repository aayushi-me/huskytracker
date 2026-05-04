/**
 * Event Service Unit Tests
 * 
 * To run these tests, first install testing dependencies:
 * npm install --save-dev jest @types/jest supertest mongodb-memory-server
 * 
 * Then run:
 * npm test
 */

const eventService = require('../../src/services/eventService');
const eventRepository = require('../../src/repositories/eventRepository');
const { EventStatus } = require('../../src/models/Event');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../src/utils/errors');

// Mock the repository
jest.mock('../../src/repositories/eventRepository');

describe('EventService', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    test('should create event with valid data', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event description',
        category: 'Academic',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 90000000), // Day after
        location: {
          name: 'Test Location',
          isVirtual: false
        }
      };
      const organizerId = 'test-organizer-id';

      // Mock repository response
      const mockEvent = { ...eventData, _id: 'test-event-id', organizer: organizerId };
      eventRepository.create.mockResolvedValue(mockEvent);
      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act
      const result = await eventService.createEvent(eventData, organizerId);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(eventData.title);
      expect(eventRepository.create).toHaveBeenCalled();
    });

    test('should reject event with start date in the past', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        startDate: new Date(Date.now() - 86400000), // Yesterday
        endDate: new Date(Date.now() + 86400000)
      };

      // Act & Assert
      await expect(
        eventService.createEvent(eventData, 'organizer-id')
      ).rejects.toThrow(ValidationError);
      
      await expect(
        eventService.createEvent(eventData, 'organizer-id')
      ).rejects.toThrow('Event start date must be in the future');
    });

    test('should reject event with end date before start date', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        startDate: new Date(Date.now() + 90000000),
        endDate: new Date(Date.now() + 86400000)
      };

      // Act & Assert
      await expect(
        eventService.createEvent(eventData, 'organizer-id')
      ).rejects.toThrow(ValidationError);
      
      await expect(
        eventService.createEvent(eventData, 'organizer-id')
      ).rejects.toThrow('Event end date must be after start date');
    });

    test('should reject event shorter than 30 minutes', async () => {
      // Arrange
      const startDate = new Date(Date.now() + 86400000);
      const endDate = new Date(startDate.getTime() + 1000000); // 16.6 minutes
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        startDate,
        endDate
      };

      // Act & Assert
      await expect(
        eventService.createEvent(eventData, 'organizer-id')
      ).rejects.toThrow('Event must be at least 30 minutes long');
    });
  });

  describe('updateEvent', () => {
    test('should update event when user is organizer', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      const updateData = { title: 'Updated Title' };
      
      const mockEvent = {
        _id: eventId,
        title: 'Original Title',
        organizer: { _id: userId },
        status: EventStatus.DRAFT,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        toObject: () => ({ _id: eventId, title: 'Original Title' })
      };

      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRepository.update.mockResolvedValue({ ...mockEvent, ...updateData });

      // Act
      const result = await eventService.updateEvent(eventId, updateData, userId);

      // Assert
      expect(result.title).toBe(updateData.title);
      expect(eventRepository.update).toHaveBeenCalledWith(eventId, updateData);
    });

    test('should reject update when user is not organizer', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'different-user-id';
      
      const mockEvent = {
        _id: eventId,
        organizer: { _id: 'organizer-id' },
        status: EventStatus.DRAFT
      };

      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act & Assert
      await expect(
        eventService.updateEvent(eventId, { title: 'Updated' }, userId)
      ).rejects.toThrow(ForbiddenError);
    });

    test('should reject capacity reduction below current registrations', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      
      const mockEvent = {
        _id: eventId,
        organizer: { _id: userId },
        currentRegistrations: 50,
        maxRegistrations: 100,
        status: EventStatus.PUBLISHED,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        toObject: () => ({})
      };

      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act & Assert
      await expect(
        eventService.updateEvent(eventId, { maxRegistrations: 30 }, userId)
      ).rejects.toThrow('Cannot set capacity to 30 when 50 users are already registered');
    });
  });

  describe('deleteEvent', () => {
    test('should hard delete event with no registrations', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      
      const mockEvent = {
        _id: eventId,
        organizer: { _id: userId },
        currentRegistrations: 0
      };

      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRepository.delete.mockResolvedValue(mockEvent);

      // Act
      const result = await eventService.deleteEvent(eventId, userId, false);

      // Assert
      expect(result.deleted).toBe(true);
      expect(result.cancelled).toBe(false);
      expect(eventRepository.delete).toHaveBeenCalledWith(eventId);
    });

    test('should soft delete event with existing registrations', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      
      const mockEvent = {
        _id: eventId,
        organizer: { _id: userId },
        currentRegistrations: 10
      };

      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRepository.softDelete.mockResolvedValue({ ...mockEvent, status: EventStatus.CANCELLED });

      // Act
      const result = await eventService.deleteEvent(eventId, userId, false);

      // Assert
      expect(result.deleted).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(eventRepository.softDelete).toHaveBeenCalledWith(eventId);
    });
  });

  describe('validateStatusTransition', () => {
    test('should allow DRAFT to PUBLISHED transition', () => {
      // Act & Assert
      expect(() => {
        eventService.validateStatusTransition(EventStatus.DRAFT, EventStatus.PUBLISHED);
      }).not.toThrow();
    });

    test('should allow PUBLISHED to IN_PROGRESS transition', () => {
      // Act & Assert
      expect(() => {
        eventService.validateStatusTransition(EventStatus.PUBLISHED, EventStatus.IN_PROGRESS);
      }).not.toThrow();
    });

    test('should allow IN_PROGRESS to COMPLETED transition', () => {
      // Act & Assert
      expect(() => {
        eventService.validateStatusTransition(EventStatus.IN_PROGRESS, EventStatus.COMPLETED);
      }).not.toThrow();
    });

    test('should reject COMPLETED to DRAFT transition', () => {
      // Act & Assert
      expect(() => {
        eventService.validateStatusTransition(EventStatus.COMPLETED, EventStatus.DRAFT);
      }).toThrow(ValidationError);
      
      expect(() => {
        eventService.validateStatusTransition(EventStatus.COMPLETED, EventStatus.DRAFT);
      }).toThrow('Cannot transition from COMPLETED to DRAFT');
    });

    test('should reject CANCELLED to PUBLISHED transition', () => {
      // Act & Assert
      expect(() => {
        eventService.validateStatusTransition(EventStatus.CANCELLED, EventStatus.PUBLISHED);
      }).toThrow(ValidationError);
    });
  });

  describe('publishEvent', () => {
    test('should publish draft event with all required fields', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      
      const mockEvent = {
        _id: eventId,
        title: 'Test Event',
        description: 'Test Description',
        organizer: { _id: userId },
        status: EventStatus.DRAFT,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        location: { name: 'Test Location' },
        category: 'Academic'
      };

      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRepository.updateStatus.mockResolvedValue({ ...mockEvent, status: EventStatus.PUBLISHED });

      // Act
      const result = await eventService.publishEvent(eventId, userId);

      // Assert
      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(eventRepository.updateStatus).toHaveBeenCalledWith(eventId, EventStatus.PUBLISHED);
    });

    test('should reject publishing event missing required fields', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      
      const mockEvent = {
        _id: eventId,
        title: 'Test Event',
        // Missing description, location, etc.
        organizer: { _id: userId },
        status: EventStatus.DRAFT
      };

      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act & Assert
      await expect(
        eventService.publishEvent(eventId, userId)
      ).rejects.toThrow('Cannot publish event. Missing required fields');
    });
  });

  describe('canUserRegister', () => {
    test('should return true for eligible registration', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'user-id';
      
      const mockEvent = {
        _id: eventId,
        status: EventStatus.PUBLISHED,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        maxRegistrations: 100,
        currentRegistrations: 50
      };

      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act
      const result = await eventService.canUserRegister(eventId, userId);

      // Assert
      expect(result.canRegister).toBe(true);
      expect(result.reason).toBe('Eligible to register');
    });

    test('should return false for full event', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'user-id';
      
      const mockEvent = {
        _id: eventId,
        status: EventStatus.PUBLISHED,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        maxRegistrations: 100,
        currentRegistrations: 100
      };

      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act
      const result = await eventService.canUserRegister(eventId, userId);

      // Assert
      expect(result.canRegister).toBe(false);
      expect(result.reason).toBe('Event is full');
      expect(result.waitlistAvailable).toBe(true);
    });

    test('should return false for past event', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'user-id';
      
      const mockEvent = {
        _id: eventId,
        status: EventStatus.PUBLISHED,
        startDate: new Date(Date.now() - 90000000),
        endDate: new Date(Date.now() - 86400000),
        maxRegistrations: 100,
        currentRegistrations: 50
      };

      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act
      const result = await eventService.canUserRegister(eventId, userId);

      // Assert
      expect(result.canRegister).toBe(false);
      expect(result.reason).toBe('Event has already ended');
    });
  });

  describe('updateEventStatuses', () => {
    test('should update event statuses based on time', async () => {
      // This test would require mocking the Event model directly
      // since updateEventStatuses queries the database
      
      // Act
      const result = await eventService.updateEventStatuses();

      // Assert
      expect(result).toBeDefined();
      expect(result.updated).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe('getDraftEventsByOrganizer', () => {
    test('should return only draft events for organizer', async () => {
      // Arrange
      const organizerId = 'organizer-id';
      const mockDraftEvents = [
        {
          _id: 'event-1',
          title: 'Draft Event 1',
          status: EventStatus.DRAFT,
          organizer: { _id: organizerId }
        },
        {
          _id: 'event-2',
          title: 'Draft Event 2',
          status: EventStatus.DRAFT,
          organizer: { _id: organizerId }
        }
      ];

      eventRepository.findAll.mockResolvedValue({
        events: mockDraftEvents,
        pagination: { currentPage: 1, totalPages: 1, totalCount: 2 }
      });

      // Act
      const result = await eventService.getDraftEventsByOrganizer(organizerId, {
        page: 1,
        limit: 20
      });

      // Assert
      expect(result.events).toHaveLength(2);
      expect(result.events.every(e => e.status === EventStatus.DRAFT)).toBe(true);
      expect(eventRepository.findAll).toHaveBeenCalledWith(
        { organizer: organizerId, status: EventStatus.DRAFT },
        expect.objectContaining({ populate: true })
      );
    });

    test('should return empty array when organizer has no drafts', async () => {
      // Arrange
      const organizerId = 'organizer-id';
      
      eventRepository.findAll.mockResolvedValue({
        events: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
      });

      // Act
      const result = await eventService.getDraftEventsByOrganizer(organizerId);

      // Assert
      expect(result.events).toHaveLength(0);
    });
  });

  describe('updateEvent - Status Changes', () => {
    test('should allow valid status transition via update', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      
      const mockEvent = {
        _id: eventId,
        title: 'Test Event',
        organizer: { _id: userId },
        status: EventStatus.DRAFT,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        currentRegistrations: 0,
        description: 'Test description',
        location: { name: 'Test' },
        category: 'Academic',
        toObject: () => ({ 
          title: 'Test Event',
          description: 'Test description',
          location: { name: 'Test' },
          category: 'Academic'
        })
      };

      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRepository.update.mockResolvedValue({ 
        ...mockEvent, 
        status: EventStatus.PUBLISHED 
      });

      // Act
      const result = await eventService.updateEvent(
        eventId, 
        { status: EventStatus.PUBLISHED }, 
        userId
      );

      // Assert
      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(eventRepository.update).toHaveBeenCalled();
    });

    test('should reject invalid status transition via update', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const userId = 'organizer-id';
      
      const mockEvent = {
        _id: eventId,
        organizer: { _id: userId },
        status: EventStatus.DRAFT,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 90000000),
        toObject: () => ({})
      };

      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act & Assert
      await expect(
        eventService.updateEvent(eventId, { status: EventStatus.COMPLETED }, userId)
      ).rejects.toThrow(ValidationError);
      
      await expect(
        eventService.updateEvent(eventId, { status: EventStatus.COMPLETED }, userId)
      ).rejects.toThrow('Cannot transition from DRAFT to COMPLETED');
    });
  });
});

describe('EventService Integration Tests', () => {
  // These would be integration tests that use a test database
  // Requires mongodb-memory-server or similar
  // For now, these are placeholders
  
  test.skip('should create and retrieve event from database', async () => {
    // Integration test with actual database
    // This requires setting up a test database
  });

  test.skip('should handle concurrent registration attempts', async () => {
    // Test race conditions with capacity management
    // This requires setting up a test database and concurrent operations
  });
});

// Export for jest
module.exports = {};
