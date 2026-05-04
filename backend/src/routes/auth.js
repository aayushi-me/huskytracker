/**
 * Authentication Routes
 * All routes related to user authentication
 */

const express = require('express');
const { 
    register, 
    login, 
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    getCurrentUser,
    updateProfile,
    changePassword
} = require('../controllers/authController');
const { validate } = require('../middleware/validation');
const { 
    registerSchema, 
    loginSchema, 
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    changePasswordSchema
} = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter, strictRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ============================================================================
// Public Routes (No authentication required)
// ============================================================================

/**
 * POST /api/v1/auth/register
 * Register a new user
 * Rate limited: 5 attempts per 15 minutes
 */
router.post(
    '/register', 
    authRateLimiter,
    validate(registerSchema), 
    register
);

/**
 * POST /api/v1/auth/login
 * Login user with email and password
 * Rate limited: 5 attempts per 15 minutes
 */
router.post(
    '/login', 
    authRateLimiter,
    validate(loginSchema), 
    login
);

/**
 * POST /api/v1/auth/refresh-token
 * Refresh access token using refresh token
 * Rate limited: 5 attempts per 15 minutes
 */
router.post(
    '/refresh-token',
    authRateLimiter,
    validate(refreshTokenSchema),
    refreshToken
);

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset (sends email with reset token)
 * Rate limited: 3 attempts per 15 minutes (stricter for security)
 */
router.post(
    '/forgot-password',
    strictRateLimiter,
    validate(forgotPasswordSchema),
    forgotPassword
);

/**
 * POST /api/v1/auth/reset-password/:token
 * Reset password using reset token from email
 * Rate limited: 3 attempts per 15 minutes
 */
router.post(
    '/reset-password/:token',
    strictRateLimiter,
    validate(resetPasswordSchema),
    resetPassword
);

// ============================================================================
// Protected Routes (Authentication required)
// ============================================================================

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile
 */
router.get(
    '/me',
    authenticate,
    getCurrentUser
);

/**
 * PUT /api/v1/auth/me
 * Update current user profile
 */
router.put(
    '/me',
    authenticate,
    validate(updateProfileSchema),
    updateProfile
);

/**
 * POST /api/v1/auth/logout
 * Logout user (invalidates refresh token)
 */
router.post(
    '/logout',
    authenticate,
    logout
);

/**
 * POST /api/v1/auth/change-password
 * Change password for authenticated user
 */
router.post(
    '/change-password',
    authenticate,
    validate(changePasswordSchema),
    changePassword
);

module.exports = router;
