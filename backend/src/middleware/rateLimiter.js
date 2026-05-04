/**
 * Rate Limiting Middleware
 * Prevents brute force attacks by limiting the number of requests
 */

// Simple in-memory rate limiter
// For production, consider using Redis for distributed rate limiting

class RateLimiter {
    constructor() {
        this.requests = new Map(); // Map of IP -> array of timestamps
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }
    
    /**
     * Clean up old entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        for (const [ip, timestamps] of this.requests.entries()) {
            // Remove timestamps older than 1 hour
            const filtered = timestamps.filter(time => now - time < 3600000);
            if (filtered.length === 0) {
                this.requests.delete(ip);
            } else {
                this.requests.set(ip, filtered);
            }
        }
    }
    
    /**
     * Check if request should be rate limited
     * @param {String} ip - Client IP address
     * @param {Number} maxAttempts - Maximum attempts allowed
     * @param {Number} windowMs - Time window in milliseconds
     * @returns {Object} { allowed: Boolean, remaining: Number, resetTime: Number }
     */
    check(ip, maxAttempts, windowMs) {
        const now = Date.now();
        const timestamps = this.requests.get(ip) || [];
        
        // Filter out timestamps outside the window
        const recentTimestamps = timestamps.filter(time => now - time < windowMs);
        
        // Check if limit exceeded
        if (recentTimestamps.length >= maxAttempts) {
            const oldestTimestamp = Math.min(...recentTimestamps);
            const resetTime = oldestTimestamp + windowMs;
            
            return {
                allowed: false,
                remaining: 0,
                resetTime: resetTime,
                retryAfter: Math.ceil((resetTime - now) / 1000) // seconds
            };
        }
        
        // Add current timestamp
        recentTimestamps.push(now);
        this.requests.set(ip, recentTimestamps);
        
        return {
            allowed: true,
            remaining: maxAttempts - recentTimestamps.length,
            resetTime: now + windowMs
        };
    }
    
    /**
     * Reset rate limit for specific IP
     * @param {String} ip - Client IP address
     */
    reset(ip) {
        this.requests.delete(ip);
    }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

/**
 * Create rate limiting middleware
 * @param {Object} options - Configuration options
 * @param {Number} options.maxAttempts - Maximum attempts allowed (default: 5)
 * @param {Number} options.windowMs - Time window in milliseconds (default: 1 minutes)
 * @param {String} options.message - Error message to return
 * @returns {Function} Express middleware function
 */
const createRateLimiter = (options = {}) => {
    const {
        maxAttempts = 5,
        windowMs = 1 * 60 * 1000, // 1 minutes
        message = 'Too many requests, please try again later'
    } = options;
    
    return (req, res, next) => {
        // Get client IP address
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        
        // Check rate limit
        const result = rateLimiter.check(ip, maxAttempts, windowMs);
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxAttempts);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        
        if (!result.allowed) {
            res.setHeader('Retry-After', result.retryAfter);
            return res.status(429).json({
                success: false,
                message: message,
                retryAfter: result.retryAfter
            });
        }
        
        next();
    };
};

/**
 * Auth rate limiter - 5 attempts per 1 minutes
 * Used for login, register, password reset endpoints
 */
const authRateLimiter = createRateLimiter({
    maxAttempts: 5,
    windowMs: 1 * 60 * 1000,
    message: 'Too many authentication attempts, please try again after 1 minutes'
});

/**
 * Strict rate limiter - 3 attempts per 1 minutes
 * Used for password reset and other sensitive operations
 */
const strictRateLimiter = createRateLimiter({
    maxAttempts: 3,
    windowMs: 1 * 60 * 1000,
    message: 'Too many attempts, please try again after 1 minutes'
});

/**
 * General API rate limiter - 100 requests per 1 minutes
 * Used for general API endpoints
 */
const apiRateLimiter = createRateLimiter({
    maxAttempts: 100,
    windowMs: 1 * 60 * 1000,
    message: 'Too many requests, please slow down'
});

module.exports = {
    createRateLimiter,
    authRateLimiter,
    strictRateLimiter,
    apiRateLimiter,
    rateLimiter // Export instance for testing/manual reset
};

