/**
 * Registration Service Unit Tests
 * Tests all registration business logic including capacity management and waitlist
 */

const registrationService = require('../../src/services/registrationService');
const eventRegistrationRepository = require('../../src/repositories/eventRegistrationRepository');
const eventRepository = require('../../src/repositories/eventRepository');
const { RegistrationStatus } = require('../../src/models/EventRegistration');
const { EventStatus } = require('../../src/models/Event');
const mongoose = require('mongoose');

// Mock repositories
jest.mock('../../src/repositories/eventRegistrationRepository');
jest.mock('../../src/repositories/eventRepository');

// Mock mongoose session
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn()
};

jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

describe('RegistrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerForEvent', () => {
    const userId = 'user-123';
    const eventId = 'event-456';

    test('should successfully register user when capacity is available', async () => {
      // Arrange
      const mockEvent = {
        _id: eventId,
        title: 'Test Event',
        status: EventStatus.PUBLISHED,
        endDate: new Date(Date.now() + 86400000),
        maxRegistrations: 50,
        currentRegistrations: 25,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRegistration = {
        _id: 'reg-789',
        user: userId,
        event: eventId,
        status: RegistrationStatus.REGISTERED,
        registeredAt: new Date()
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRegistrationRepository.create.mockResolvedValue(mockRegistration);
      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);

      // Act
      const result = await registrationService.registerForEvent(userId, eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe('REGISTERED');
      expect(result.message).toBe('Successfully registered for event');
      expect(mockEvent.currentRegistrations).toBe(26);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    test('should add user to waitlist when event is at capacity', async () => {
      // Arrange
      const mockEvent = {
        _id: eventId,
        title: 'Test Event',
        status: EventStatus.PUBLISHED,
        endDate: new Date(Date.now() + 86400000),
        maxRegistrations: 50,
        currentRegistrations: 50,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRegistration = {
        _id: 'reg-789',
        user: userId,
        event: eventId,
        status: RegistrationStatus.WAITLISTED,
        waitlistPosition: 1
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRegistrationRepository.getNextWaitlistPosition.mockResolvedValue(1);
      eventRegistrationRepository.create.mockResolvedValue(mockRegistration);
      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);

      // Act
      const result = await registrationService.registerForEvent(userId, eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe('WAITLISTED');
      expect(result.waitlistPosition).toBe(1);
      expect(result.message).toContain('waitlist');
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    test('should reject duplicate registration', async () => {
      // Arrange
      const existingRegistration = {
        _id: 'existing-reg',
        user: userId,
        event: eventId,
        status: RegistrationStatus.REGISTERED
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(existingRegistration);

      // Act & Assert
      await expect(
        registrationService.registerForEvent(userId, eventId)
      ).rejects.toThrow('already registered');
      
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test('should reject registration for non-existent event', async () => {
      // Arrange
      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        registrationService.registerForEvent(userId, eventId)
      ).rejects.toThrow('Event not found');
      
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test('should reject registration for cancelled event', async () => {
      // Arrange
      const mockEvent = {
        _id: eventId,
        status: EventStatus.CANCELLED,
        endDate: new Date(Date.now() + 86400000)
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act & Assert
      await expect(
        registrationService.registerForEvent(userId, eventId)
      ).rejects.toThrow('Cannot register for cancelled event');
      
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test('should reject registration for past event', async () => {
      // Arrange
      const mockEvent = {
        _id: eventId,
        status: EventStatus.PUBLISHED,
        endDate: new Date(Date.now() - 86400000) // Yesterday
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act & Assert
      await expect(
        registrationService.registerForEvent(userId, eventId)
      ).rejects.toThrow('Cannot register for past events');
      
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test('should handle unlimited capacity events', async () => {
      // Arrange
      const mockEvent = {
        _id: eventId,
        title: 'Test Event',
        status: EventStatus.PUBLISHED,
        endDate: new Date(Date.now() + 86400000),
        maxRegistrations: null, // Unlimited
        currentRegistrations: 100,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRegistration = {
        _id: 'reg-789',
        user: userId,
        event: eventId,
        status: RegistrationStatus.REGISTERED
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRegistrationRepository.create.mockResolvedValue(mockRegistration);
      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);

      // Act
      const result = await registrationService.registerForEvent(userId, eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe('REGISTERED');
      expect(mockEvent.currentRegistrations).toBe(101);
    });
  });

  describe('cancelRegistration', () => {
    const userId = 'user-123';
    const registrationId = 'reg-789';

    test('should successfully cancel registration', async () => {
      // Arrange
      const mockEvent = {
        _id: 'event-456',
        currentRegistrations: 25,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRegistration = {
        _id: registrationId,
        user: userId,
        event: 'event-456',
        status: RegistrationStatus.REGISTERED,
        save: jest.fn().mockResolvedValue(true)
      };

      const Event = require('../../src/models/Event').Event;
      jest.spyOn(Event, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockEvent)
      });

      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);
      eventRegistrationRepository.getFirstWaitlisted.mockResolvedValue(null);

      // Act
      const result = await registrationService.cancelRegistration(registrationId, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockRegistration.status).toBe(RegistrationStatus.CANCELLED);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    test('should reject cancellation for non-owner', async () => {
      // Arrange
      const mockRegistration = {
        _id: registrationId,
        user: 'different-user',
        event: 'event-456',
        status: RegistrationStatus.REGISTERED
      };

      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);

      // Act & Assert
      await expect(
        registrationService.cancelRegistration(registrationId, userId)
      ).rejects.toThrow('do not have permission');
      
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test('should reject cancellation of already cancelled registration', async () => {
      // Arrange
      const mockRegistration = {
        _id: registrationId,
        user: userId,
        event: 'event-456',
        status: RegistrationStatus.CANCELLED
      };

      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);

      // Act & Assert
      await expect(
        registrationService.cancelRegistration(registrationId, userId)
      ).rejects.toThrow('already cancelled');
      
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test('should promote waitlisted user when spot opens', async () => {
      // Arrange
      const mockEvent = {
        _id: 'event-456',
        currentRegistrations: 50,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRegistration = {
        _id: registrationId,
        user: userId,
        event: 'event-456',
        status: RegistrationStatus.REGISTERED,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockWaitlisted = {
        _id: 'waitlist-reg',
        user: 'waitlist-user',
        event: 'event-456',
        status: RegistrationStatus.WAITLISTED,
        waitlistPosition: 1,
        save: jest.fn().mockResolvedValue(true)
      };

      const Event = require('../../src/models/Event').Event;
      jest.spyOn(Event, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockEvent)
      });

      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);
      eventRegistrationRepository.getFirstWaitlisted.mockResolvedValue(mockWaitlisted);
      eventRegistrationRepository.recalculateWaitlistPositions.mockResolvedValue();

      // Act
      await registrationService.cancelRegistration(registrationId, userId);

      // Assert
      expect(mockWaitlisted.status).toBe(RegistrationStatus.REGISTERED);
      expect(mockWaitlisted.waitlistPosition).toBeNull();
      expect(eventRegistrationRepository.recalculateWaitlistPositions).toHaveBeenCalled();
    });
  });

  describe('checkEligibility', () => {
    const userId = 'user-123';
    const eventId = 'event-456';

    test('should return eligible when user can register', async () => {
      // Arrange
      const mockEvent = {
        _id: eventId,
        status: EventStatus.PUBLISHED,
        endDate: new Date(Date.now() + 86400000),
        maxRegistrations: 50,
        currentRegistrations: 25
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act
      const result = await registrationService.checkEligibility(userId, eventId);

      // Assert
      expect(result.eligible).toBe(true);
      expect(result.hasCapacity).toBe(true);
      expect(result.availableSpots).toBe(25);
    });

    test('should return not eligible when already registered', async () => {
      // Arrange
      const mockRegistration = {
        _id: 'reg-789',
        user: userId,
        event: eventId,
        status: RegistrationStatus.REGISTERED
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(mockRegistration);

      // Act
      const result = await registrationService.checkEligibility(userId, eventId);

      // Assert
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Already registered');
    });

    test('should indicate waitlist when event is full', async () => {
      // Arrange
      const mockEvent = {
        _id: eventId,
        status: EventStatus.PUBLISHED,
        endDate: new Date(Date.now() + 86400000),
        maxRegistrations: 50,
        currentRegistrations: 50
      };

      eventRegistrationRepository.findByUserAndEvent.mockResolvedValue(null);
      eventRepository.findById.mockResolvedValue(mockEvent);

      // Act
      const result = await registrationService.checkEligibility(userId, eventId);

      // Assert
      expect(result.eligible).toBe(true);
      expect(result.hasCapacity).toBe(false);
      expect(result.willBeWaitlisted).toBe(true);
      expect(result.availableSpots).toBe(0);
    });
  });

  describe('markAttendance', () => {
    const organizerId = 'organizer-123';
    const registrationId = 'reg-789';

    test('should successfully mark attendance', async () => {
      // Arrange
      const mockEvent = {
        _id: 'event-456',
        endDate: new Date(Date.now() - 3600000) // 1 hour ago
      };

      const mockRegistration = {
        _id: registrationId,
        user: 'user-123',
        event: mockEvent,
        status: RegistrationStatus.REGISTERED,
        save: jest.fn().mockResolvedValue(true)
      };

      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);
      eventRepository.isOrganizer.mockResolvedValue(true);

      // Act
      const result = await registrationService.markAttendance(registrationId, organizerId, true);

      // Assert
      expect(result.success).toBe(true);
      expect(mockRegistration.status).toBe(RegistrationStatus.ATTENDED);
      expect(mockRegistration.attendedAt).toBeDefined();
    });

    test('should reject attendance before event ends', async () => {
      // Arrange
      const mockEvent = {
        _id: 'event-456',
        endDate: new Date(Date.now() + 3600000) // 1 hour from now
      };

      const mockRegistration = {
        _id: registrationId,
        user: 'user-123',
        event: mockEvent,
        status: RegistrationStatus.REGISTERED
      };

      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);
      eventRepository.isOrganizer.mockResolvedValue(true);

      // Act & Assert
      await expect(
        registrationService.markAttendance(registrationId, organizerId, true)
      ).rejects.toThrow('Cannot mark attendance before event ends');
    });

    test('should reject attendance by non-organizer', async () => {
      // Arrange
      const mockEvent = {
        _id: 'event-456',
        endDate: new Date(Date.now() - 3600000)
      };

      const mockRegistration = {
        _id: registrationId,
        user: 'user-123',
        event: mockEvent,
        status: RegistrationStatus.REGISTERED
      };

      eventRegistrationRepository.findById.mockResolvedValue(mockRegistration);
      eventRepository.isOrganizer.mockResolvedValue(false);

      // Act & Assert
      await expect(
        registrationService.markAttendance(registrationId, organizerId, true)
      ).rejects.toThrow('Only event organizers can mark attendance');
    });
  });

  describe('getEventAttendees', () => {
    const organizerId = 'organizer-123';
    const eventId = 'event-456';

    test('should return attendees for organizer', async () => {
      // Arrange
      const mockResult = {
        registrations: [
          { _id: 'reg-1', status: RegistrationStatus.REGISTERED },
          { _id: 'reg-2', status: RegistrationStatus.REGISTERED }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 2
        }
      };

      eventRepository.isOrganizer.mockResolvedValue(true);
      eventRegistrationRepository.findByEvent.mockResolvedValue(mockResult);

      // Act
      const result = await registrationService.getEventAttendees(eventId, organizerId, {}, {});

      // Assert
      expect(result.registrations).toHaveLength(2);
      expect(eventRepository.isOrganizer).toHaveBeenCalledWith(eventId, organizerId);
    });

    test('should reject non-organizer', async () => {
      // Arrange
      eventRepository.isOrganizer.mockResolvedValue(false);

      // Act & Assert
      await expect(
        registrationService.getEventAttendees(eventId, organizerId, {}, {})
      ).rejects.toThrow('Only event organizers can view attendees');
    });
  });
});

