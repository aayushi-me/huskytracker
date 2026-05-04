/**
 * Custom Error Classes
 * Provides custom error types for better error handling
 */

/**
 * Base API Error class
 * All custom errors extend this class
 */
class ApiError extends Error {
    constructor(statusCode, message, errors = null) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 400 Bad Request
 */
class BadRequestError extends ApiError {
    constructor(message = 'Bad Request', errors = null) {
        super(400, message, errors);
    }
}

/**
 * 400 Validation Error
 * Alias for BadRequestError with validation-specific message
 */
class ValidationError extends BadRequestError {
    constructor(message = 'Validation failed', errors = null) {
        super(message, errors);
    }
}

/**
 * 401 Unauthorized
 */
class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(401, message);
    }
}

/**
 * 403 Forbidden
 */
class ForbiddenError extends ApiError {
    constructor(message = 'Access denied. Insufficient permissions.') {
        super(403, message);
    }
}

/**
 * 404 Not Found
 */
class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(404, message);
    }
}

/**
 * 409 Conflict
 */
class ConflictError extends ApiError {
    constructor(message = 'Resource already exists') {
        super(409, message);
    }
}

/**
 * 429 Too Many Requests
 */
class TooManyRequestsError extends ApiError {
    constructor(message = 'Too many requests, please try again later', retryAfter = null) {
        super(429, message);
        this.retryAfter = retryAfter;
    }
}

/**
 * 500 Internal Server Error
 */
class InternalServerError extends ApiError {
    constructor(message = 'Internal server error') {
        super(500, message);
    }
}

/**
 * Registration-specific errors
 */

/**
 * Registration Already Exists Error (409 Conflict)
 */
class RegistrationExistsError extends ConflictError {
    constructor(message = 'You are already registered for this event') {
        super(message);
    }
}

/**
 * Event Capacity Exceeded Error (409 Conflict)
 */
class CapacityExceededError extends ConflictError {
    constructor(message = 'Event is at full capacity') {
        super(message);
    }
}

/**
 * Registration Not Found Error (404 Not Found)
 */
class RegistrationNotFoundError extends NotFoundError {
    constructor(message = 'Registration not found') {
        super(message);
    }
}

/**
 * Event Registration Closed Error (400 Bad Request)
 */
class RegistrationClosedError extends BadRequestError {
    constructor(message = 'Registration for this event is closed') {
        super(message);
    }
}

/**
 * Success response formatter
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {Object} data - Response data
 */
const sendSuccess = (res, statusCode = 200, message, data = null) => {
    const response = {
        success: true,
        message
    };
    
    if (data) {
        response.data = data;
    }
    
    return res.status(statusCode).json(response);
};

/**
 * Error response formatter
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {Array|Object} errors - Validation errors or error details
 */
const sendError = (res, statusCode = 500, message, errors = null) => {
    const response = {
        success: false,
        message
    };
    
    if (errors) {
        response.errors = errors;
    }
    
    // Don't send stack traces in production
    if (process.env.NODE_ENV === 'development' && errors?.stack) {
        response.stack = errors.stack;
    }
    
    return res.status(statusCode).json(response);
};

/**
 * Handle async route errors
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 * Handles custom errors and standardizes error responses
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Handle custom errors with statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || 'An error occurred',
      ...(err.errors && { errors: err.errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
    ApiError,
    BadRequestError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    TooManyRequestsError,
    InternalServerError,
    RegistrationExistsError,
    CapacityExceededError,
    RegistrationNotFoundError,
    RegistrationClosedError,
    sendSuccess,
    sendError,
    asyncHandler,
    errorHandler
};
