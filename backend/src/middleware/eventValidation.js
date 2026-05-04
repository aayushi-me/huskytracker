/**
 * Event Validation Middleware
 * Zod schemas for event-related request validation
 */

const { z } = require('zod');
const { EventStatus } = require('../models/Event');

// Location schema
const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }).optional(),
  isVirtual: z.boolean().optional(),
  virtualLink: z.string().url('Invalid virtual link URL').optional()
}).refine(
  (data) => {
    // If virtual, must have virtualLink
    if (data.isVirtual && !data.virtualLink) {
      return false;
    }
    return true;
  },
  {
    message: 'Virtual events must have a virtual link',
    path: ['virtualLink']
  }
);

// Create event schema
const createEventSchema = z.object({
  body: z.object({
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title cannot exceed 200 characters')
      .trim(),
    description: z.string()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description cannot exceed 5000 characters')
      .trim(),
    category: z.enum(['Academic', 'Career', 'Clubs', 'Sports', 'Social', 'Cultural', 'Other'], {
      errorMap: () => ({ message: 'Invalid category' })
    }),
    status: z.enum([EventStatus.DRAFT, EventStatus.PUBLISHED]).optional(),
    startDate: z.union([z.string(), z.date()]).transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid start date: ${val}`);
      }
      return date;
    }),
    endDate: z.union([z.string(), z.date()]).transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid end date: ${val}`);
      }
      return date;
    }),
    location: locationSchema,
    maxRegistrations: z.number().int().min(1).nullable().optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
    isPublic: z.boolean().optional()
  }).refine(
    (data) => {
      // Dates are already transformed to Date objects
      const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
      const end = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
      
      // Extract date strings (YYYY-MM-DD) for comparison
      const startDateOnly = start.toISOString().slice(0, 10); // YYYY-MM-DD
      const endDateOnly = end.toISOString().slice(0, 10); // YYYY-MM-DD
      const isSameDate = startDateOnly === endDateOnly;
      
      // For multi-day events: only check that end date is after start date (ignore time)
      // For same-day events: check both date and time, plus minimum duration
      if (!isSameDate) {
        // Multi-day event: compare date strings
        return endDateOnly > startDateOnly;
      } else {
        // Same-day event: validate time and duration
        if (end <= start) {
          return false;
        }
        
        // Validate minimum duration (30 minutes) for same-day events
        const durationMs = end.getTime() - start.getTime();
        const minDurationMs = 30 * 60 * 1000; // 30 minutes
        return durationMs >= minDurationMs;
      }
    },
    {
      message: 'End date must be after start date. For same-day events, duration must be at least 30 minutes',
      path: ['endDate']
    }
  ).refine(
    (data) => {
      // Dates are already transformed to Date objects
      const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
      const now = new Date();
      return start > now;
    },
    {
      message: 'Start date must be in the future',
      path: ['startDate']
    }
  )
});

// Update event schema
const updateEventSchema = z.object({
  body: z.object({
    title: z.string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title cannot exceed 200 characters')
      .trim()
      .optional(),
    description: z.string()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description cannot exceed 5000 characters')
      .trim()
      .optional(),
    category: z.enum(['Academic', 'Career', 'Clubs', 'Sports', 'Social', 'Cultural', 'Other']).optional(),
    status: z.nativeEnum(EventStatus).optional(),
    startDate: z.union([z.string(), z.date()]).transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid start date: ${val}`);
      }
      return date;
    }).optional(),
    endDate: z.union([z.string(), z.date()]).transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid end date: ${val}`);
      }
      return date;
    }).optional(),
    location: locationSchema.optional(),
    maxRegistrations: z.number().int().min(1).nullable().optional(),
    imageUrl: z.string().url('Invalid image URL').nullable().optional(),
    tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
    isPublic: z.boolean().optional()
  }).refine(
    (data) => {
      // Only validate if both dates are provided
      if (data.startDate && data.endDate) {
        // Dates are already transformed to Date objects
        const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
        const end = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
        
        // Extract date strings (YYYY-MM-DD) for comparison
        const startDateOnly = start.toISOString().slice(0, 10); // YYYY-MM-DD
        const endDateOnly = end.toISOString().slice(0, 10); // YYYY-MM-DD
        const isSameDate = startDateOnly === endDateOnly;
        
        // For multi-day events: only check that end date is after start date (ignore time)
        // For same-day events: check both date and time, plus minimum duration
        if (!isSameDate) {
          // Multi-day event: compare date strings
          return endDateOnly > startDateOnly;
        } else {
          // Same-day event: validate time and duration
          if (end <= start) {
            return false;
          }
          
          // Validate minimum duration (30 minutes) for same-day events
          const durationMs = end.getTime() - start.getTime();
          const minDurationMs = 30 * 60 * 1000; // 30 minutes
          return durationMs >= minDurationMs;
        }
      }
      return true;
    },
    {
      message: 'End date must be after start date. For same-day events, duration must be at least 30 minutes',
      path: ['endDate']
    }
  ).refine(
    (data) => {
      // Only validate start date if it's being updated
      if (data.startDate) {
        // Dates are already transformed to Date objects
        const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
        const now = new Date();
        return start > now;
      }
      return true;
    },
    {
      message: 'Start date must be in the future',
      path: ['startDate']
    }
  )
});

// Query parameters schema for listing events
const getEventsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    category: z.union([
      z.enum(['Academic', 'Career', 'Clubs', 'Sports', 'Social', 'Cultural', 'Other']),
      z.string().transform((val) => val.split(','))
    ]).optional(),
    status: z.union([
      z.nativeEnum(EventStatus),
      z.string().transform((val) => val.split(','))
    ]).optional(),
    search: z.string().max(500, 'Search query cannot exceed 500 characters').optional(),
    searchQuery: z.string().max(500, 'Search query cannot exceed 500 characters').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    tags: z.union([
      z.string(),
      z.string().transform((val) => val.split(','))
    ]).optional(),
    location: z.string().optional(),
    capacity: z.enum(['available', 'full']).optional(),
    includePast: z.string().transform((val) => val === 'true').optional(),
    isPublic: z.string().transform((val) => val === 'true').optional(),
    sort: z.enum(['date', 'popularity', 'capacity', 'relevance', 'created', '-date', '-popularity', '-capacity', '-relevance', '-created', 'startDate', '-startDate', 'createdAt', '-createdAt', 'title', '-title', 'currentRegistrations', '-currentRegistrations']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});

// Search query schema - supports both q and searchQuery for backward compatibility
const searchEventsSchema = z.object({
  query: z.object({
    q: z.string().max(500, 'Search query cannot exceed 500 characters').optional(),
    searchQuery: z.string().max(500, 'Search query cannot exceed 500 characters').optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    category: z.union([
      z.enum(['Academic', 'Career', 'Clubs', 'Sports', 'Social', 'Cultural', 'Other']),
      z.string().transform((val) => val.split(','))
    ]).optional(),
    status: z.union([
      z.nativeEnum(EventStatus),
      z.string().transform((val) => val.split(','))
    ]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    tags: z.union([
      z.string(),
      z.string().transform((val) => val.split(','))
    ]).optional(),
    location: z.string().optional(),
    capacity: z.enum(['available', 'full']).optional(),
    includePast: z.string().transform((val) => val === 'true').optional(),
    sort: z.enum(['date', 'popularity', 'capacity', 'relevance', 'created', '-date', '-popularity', '-capacity', '-relevance', '-created', 'startDate', '-startDate', 'createdAt', '-createdAt', 'title', '-title', 'currentRegistrations', '-currentRegistrations']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  }).refine(
    (data) => {
      // At least one of q or searchQuery should be provided, or it's optional for filtering only
      return true; // Allow empty search for filtering only
    },
    {
      message: 'Either q or searchQuery must be provided',
      path: ['q']
    }
  )
});

// Validation middleware factory
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      // Update req.body with parsed/transformed data
      if (result.body) {
        req.body = result.body;
      }
      
      next();
    } catch (error) {
      // Check if it's a Zod error
      if (error.name === 'ZodError' || error instanceof z.ZodError) {
        const errors = [];
        
        if (error.issues && Array.isArray(error.issues)) {
          // Zod v4 uses 'issues' instead of 'errors'
          error.issues.forEach(issue => {
            // Remove 'body' from the path to make it cleaner
            const path = issue.path.filter(p => p !== 'body');
            errors.push({
              field: path.length > 0 ? path.join('.') : 'unknown',
              message: issue.message
            });
          });
        } else if (error.errors && Array.isArray(error.errors)) {
          // Fallback for older Zod versions
          error.errors.forEach(err => {
            const path = err.path.filter(p => p !== 'body');
            errors.push({
              field: path.length > 0 ? path.join('.') : 'unknown',
              message: err.message
            });
          });
        }
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.length > 0 ? errors : [{ message: 'Validation error occurred' }]
        });
      }
      
      // Pass non-Zod errors to global error handler
      next(error);
    }
  };
};

module.exports = {
  validateCreateEvent: validate(createEventSchema),
  validateUpdateEvent: validate(updateEventSchema),
  validateGetEvents: validate(getEventsQuerySchema),
  validateSearchEvents: validate(searchEventsSchema)
};

