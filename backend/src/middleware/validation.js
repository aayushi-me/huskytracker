/**
 * Validation Middleware
 * Uses Zod for request validation with comprehensive schemas
 */

const { z } = require('zod');
const { USER_ROLES } = require('../models/User');

/**
 * Password validation with strength requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Email validation (must be valid email format)
 */
const emailSchema = z.string()
    .email('Invalid email address')
    .toLowerCase();

/**
 * Registration validation schema
 */
const registerSchema = z.object({
    body: z.object({
        firstName: z.string()
            .min(1, 'First name is required')
            .max(50, 'First name cannot exceed 50 characters')
            .trim(),
        lastName: z.string()
            .min(1, 'Last name is required')
            .max(50, 'Last name cannot exceed 50 characters')
            .trim(),
        email: emailSchema,
        password: passwordSchema,
        university: z.string()
            .min(1, 'University is required')
            .trim(),
        role: z.enum([USER_ROLES.STUDENT, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN])
            .default(USER_ROLES.STUDENT)
            .optional()
    })
});

/**
 * Login validation schema
 */
const loginSchema = z.object({
    body: z.object({
        email: emailSchema,
        password: z.string().min(1, 'Password is required')
    })
});

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required')
    })
});

/**
 * Forgot password validation schema
 */
const forgotPasswordSchema = z.object({
    body: z.object({
        email: emailSchema
    })
});

/**
 * Reset password validation schema
 */
const resetPasswordSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Reset token is required')
    }),
    body: z.object({
        password: passwordSchema
    })
});

/**
 * Update profile validation schema
 */
const updateProfileSchema = z.object({
    body: z.object({
        firstName: z.string()
            .min(1, 'First name is required')
            .max(50, 'First name cannot exceed 50 characters')
            .trim()
            .optional(),
        lastName: z.string()
            .min(1, 'Last name is required')
            .max(50, 'Last name cannot exceed 50 characters')
            .trim()
            .optional(),
        university: z.string()
            .min(1, 'University is required')
            .trim()
            .optional()
    })
});

/**
 * Change password validation schema
 */
const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: passwordSchema
    })
});

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
    try {
        const result = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        });
        
        // Replace req properties with validated data
        if (result.body) req.body = result.body;
        if (result.query) req.query = result.query;
        if (result.params) req.params = result.params;
        
        next();
    } catch (error) {
        // Check if it's a Zod validation error
        // Note: Zod uses 'issues' property, not 'errors'
        if (error instanceof z.ZodError) {
            const issues = error.issues || error.errors || [];
            
            if (Array.isArray(issues) && issues.length > 0) {
                const errors = issues.map(err => ({
                    field: err.path ? err.path.join('.') : 'unknown',
                    message: err.message || 'Validation error'
                }));
                
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors
                });
            }
        }
        
        // Handle other errors
        console.error('Validation error:', error);
        return res.status(400).json({
            success: false,
            message: 'Validation error'
        });
    }
};

module.exports = {
    validate,
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    changePasswordSchema,
    passwordSchema,
    emailSchema
};
