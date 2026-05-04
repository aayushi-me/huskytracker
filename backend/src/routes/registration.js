/**
 * Registration Routes
 * Handles event registration endpoints
 */

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { z } = require('zod');

// MongoDB ObjectId validation helper
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

// Validation schemas

const registerForEventSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

const cancelRegistrationSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

const getUserRegistrationsSchema = z.object({
  query: z.object({
    status: z.enum(['REGISTERED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }).partial().optional()
});

const getEventAttendeesSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({
    status: z.enum(['REGISTERED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }).partial().optional()
});

const markAttendanceSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    attended: z.boolean().optional()
  }).partial().optional()
});

const getRegistrationDetailsSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

const checkEligibilitySchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

const getRegistrationStatsSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

// Routes

// POST /api/v1/events/:id/register - Register for an event
router.post(
  '/events/:id/register',
  authenticate,
  validate(registerForEventSchema),
  registrationController.register
);

// DELETE /api/v1/registrations/:id - Cancel a registration
router.delete(
  '/registrations/:id',
  authenticate,
  validate(cancelRegistrationSchema),
  registrationController.cancelRegistration
);

// GET /api/v1/registrations/me - Get user's registrations
router.get(
  '/registrations/me',
  authenticate,
  validate(getUserRegistrationsSchema),
  registrationController.getUserRegistrations
);

// GET /api/v1/events/:id/attendees - Get event attendees (organizer only)
router.get(
  '/events/:id/attendees',
  authenticate,
  validate(getEventAttendeesSchema),
  registrationController.getEventAttendees
);

// POST /api/v1/registrations/:id/attendance - Mark attendance
router.post(
  '/registrations/:id/attendance',
  authenticate,
  validate(markAttendanceSchema),
  registrationController.markAttendance
);

// GET /api/v1/registrations/:id - Get registration details
router.get(
  '/registrations/:id',
  authenticate,
  validate(getRegistrationDetailsSchema),
  registrationController.getRegistrationDetails
);

// GET /api/v1/events/:id/eligibility - Check eligibility for event
router.get(
  '/events/:id/eligibility',
  authenticate,
  validate(checkEligibilitySchema),
  registrationController.checkEligibility
);

// GET /api/v1/events/:id/registration-stats - Get registration statistics
router.get(
  '/events/:id/registration-stats',
  authenticate,
  validate(getRegistrationStatsSchema),
  registrationController.getRegistrationStats
);

module.exports = router;

