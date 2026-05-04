/**
 * Authentication and Authorization Middleware
 * Handles token verification and role-based access control
 */

const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authentication middleware - Verify JWT token
 * Attaches user object to req.user if token is valid
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        // Extract token
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        // Verify token
        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || 'Invalid token'
            });
        }
        
        // Get user from database (excluding password)
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }
        
        // Attach user to request object
        req.user = user;
        req.userId = user._id;
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Authorization middleware - Check user role
 * @param {...String} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * 
 * Usage: router.get('/admin', authenticate, authorize('ADMIN'), handler)
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }
        
        next();
    };
};

/**
 * Check if user has specific role
 * @param {String} role - Required role
 * @returns {Function} Express middleware function
 * 
 * Alias for authorize() with single role
 */
const checkRole = (role) => {
    return authorize(role);
};

/**
 * Admin only middleware
 * Shorthand for authorize('ADMIN')
 */
const adminOnly = authorize('ADMIN');

/**
 * Organizer or Admin middleware
 * Allows both organizers and admins
 */
const organizerOrAdmin = authorize('ORGANIZER', 'ADMIN');

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs unauthenticated users
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // No token, continue without user
        }
        
        const token = authHeader.substring(7);
        
        if (!token) {
            return next();
        }
        
        try {
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.id).select('-password');
            
            if (user && user.isActive) {
                req.user = user;
                req.userId = user._id;
            }
        } catch (error) {
            // Token invalid or expired, just continue without user
            console.log('Optional auth failed:', error.message);
        }
        
        next();
    } catch (error) {
        console.error('Optional authentication error:', error);
        next(); // Continue even on error
    }
};

module.exports = {
    authenticate,
    authorize,
    checkRole,
    adminOnly,
    organizerOrAdmin,
    optionalAuth
};

