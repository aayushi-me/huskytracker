/**
 * Comment Validation Middleware
 * Validates comment-related request data using Zod schemas
 */

const { z } = require('zod');

/**
 * MongoDB ObjectId validation helper
 */
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

/**
 * Validation schema for creating a comment
 */
const createCommentSchema = z.object({
  params: z.object({
    id: objectIdSchema // Event ID
  }),
  body: z.object({
    content: z.string()
      .min(1, 'Comment content is required')
      .max(2000, 'Comment content cannot exceed 2000 characters')
      .trim(),
    rating: z.union([
      z.number()
        .int('Rating must be an integer between 1 and 5')
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5'),
      z.string()
        .regex(/^[1-5]$/, 'Rating must be a number between 1 and 5')
        .transform(val => parseInt(val, 10)),
      z.null(),
      z.undefined()
    ], {
      errorMap: () => ({ message: 'Rating must be a number between 1 and 5 (or omitted)' })
    }).optional()
  })
});

/**
 * Validation schema for updating a comment
 */
const updateCommentSchema = z.object({
  params: z.object({
    id: objectIdSchema // Comment ID
  }),
  body: z.object({
    content: z.string()
      .min(1, 'Comment content cannot be empty')
      .max(2000, 'Comment content cannot exceed 2000 characters')
      .trim()
      .optional(),
    rating: z.union([
      z.number()
        .int('Rating must be an integer between 1 and 5')
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5'),
      z.string()
        .regex(/^[1-5]$/, 'Rating must be a number between 1 and 5')
        .transform(val => parseInt(val, 10)),
      z.null(),
      z.undefined()
    ], {
      errorMap: () => ({ message: 'Rating must be a number between 1 and 5 (or omitted/null)' })
    }).optional()
  }).refine(
    data => data.content !== undefined || data.rating !== undefined,
    { message: 'At least one field (content or rating) must be provided for update' }
  )
});

/**
 * Validation schema for flagging a comment
 */
const flagCommentSchema = z.object({
  params: z.object({
    id: objectIdSchema // Comment ID
  }),
  body: z.object({
    reason: z.enum(['spam', 'inappropriate', 'harassment', 'off_topic', 'other'], {
      errorMap: () => ({ message: 'Invalid flag reason. Must be one of: spam, inappropriate, harassment, off_topic, other' })
    })
  })
});

/**
 * Validation schema for getting event comments
 */
const getEventCommentsSchema = z.object({
  params: z.object({
    id: objectIdSchema // Event ID
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional(),
    sort: z.enum(['newest', 'oldest', 'highest_rated', 'lowest_rated']).optional()
  }).partial().optional()
});

/**
 * Validation schema for getting flagged comments
 */
const getFlaggedCommentsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional()
  }).partial().optional()
});

/**
 * Validation schema for comment ID parameter
 */
const commentIdSchema = z.object({
  params: z.object({
    id: objectIdSchema // Comment ID
  })
});

/**
 * Middleware to validate request against a Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request data
      const result = schema.safeParse({
        body: req.body || {},
        query: req.query || {},
        params: req.params || {}
      });

      if (!result.success) {
        // Format validation errors with detailed messages
        let errors = [];
        
        if (result.error && result.error.errors && Array.isArray(result.error.errors)) {
          errors = result.error.errors.map(err => {
            // Format field path
            const field = err.path && err.path.length > 0 ? err.path.join('.') : 'request';

            // Debug log for troubleshooting
            console.log('Validation error:', JSON.stringify({
              code: err.code,
              message: err.message,
              path: err.path,
              hasUnionErrors: !!err.unionErrors
            }));

            // Handle union type errors (like rating field)
            if (err.code === 'invalid_union') {
              // Always use custom error message if provided by errorMap
              if (err.message) {
                return {
                  field,
                  message: err.message
                };
              }
              
              // Fallback: try to extract from unionErrors
              const unionErrors = err.unionErrors || [];
              const relevantError = unionErrors.find(ue => 
                ue.issues && ue.issues.length > 0
              );
              
              if (relevantError && relevantError.issues[0]) {
                const issue = relevantError.issues[0];
                return {
                  field,
                  message: issue.message || 'Invalid value'
                };
              }
              
              // Final fallback for union errors
              return {
                field,
                message: 'Invalid value provided'
              };
            }

            // Custom messages for common validation errors
            let message = err.message || 'Validation error';
            
            if (err.code === 'invalid_type') {
              const expected = err.expected;
              const received = err.received;
              message = `Expected ${expected}, but received ${received}`;
            } else if (err.code === 'too_small') {
              message = `Value is too small. Minimum: ${err.minimum}`;
            } else if (err.code === 'too_big') {
              message = `Value is too large. Maximum: ${err.maximum}`;
            } else if (err.code === 'invalid_string' && err.validation === 'regex') {
              message = err.message || 'Invalid format';
            }

            return {
              field,
              message
            };
          });
        } else {
          // Fallback error if we can't parse the validation error
          errors = [{
            field: 'request',
            message: 'Validation failed. Please check your request data.'
          }];
        }

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      // Attach validated data to request
      req.validatedData = result.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Validation processing failed',
        error: error.message
      });
    }
  };
};

/**
 * Export validation middleware functions
 */
module.exports = {
  validate,
  validateCreateComment: validate(createCommentSchema),
  validateUpdateComment: validate(updateCommentSchema),
  validateFlagComment: validate(flagCommentSchema),
  validateGetEventComments: validate(getEventCommentsSchema),
  validateGetFlaggedComments: validate(getFlaggedCommentsSchema),
  validateCommentId: validate(commentIdSchema)
};

