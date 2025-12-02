/**
 * Centralized Error Handler for NexaNova Backend
 * Provides consistent error responses and logging
 */

// Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

// Error types
const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE: 'DATABASE_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR'
};

/**
 * Create standardized error response
 */
const createErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    message: error.message || 'An unexpected error occurred',
    errorType: error.errorType || ErrorTypes.INTERNAL
  };

  if (error.details) {
    response.details = error.details;
  }

  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

/**
 * Central error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('❌ Error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    userId: req.userId || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(createErrorResponse({
      message: err.message,
      errorType: ErrorTypes.VALIDATION
    }));
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json(createErrorResponse({
      message: 'Invalid or expired token',
      errorType: ErrorTypes.AUTHENTICATION
    }));
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json(createErrorResponse({
      message: 'Database constraint violation',
      errorType: ErrorTypes.DATABASE,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }));
  }

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(createErrorResponse(err));
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json(createErrorResponse({
    message: isDev ? err.message : 'Internal server error',
    errorType: ErrorTypes.INTERNAL
  }, isDev));
};

/**
 * Async handler wrapper to catch errors in async routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Request validation middleware factory
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
          errors.push(`${field} is required`);
        }
      }
    }

    // Validate field types
    if (schema.types) {
      for (const [field, type] of Object.entries(schema.types)) {
        const value = req.body[field];
        if (value !== undefined && value !== null) {
          if (type === 'number' && typeof value !== 'number') {
            errors.push(`${field} must be a number`);
          }
          if (type === 'string' && typeof value !== 'string') {
            errors.push(`${field} must be a string`);
          }
          if (type === 'boolean' && typeof value !== 'boolean') {
            errors.push(`${field} must be a boolean`);
          }
          if (type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push(`${field} must be a valid email`);
            }
          }
        }
      }
    }

    // Validate enum values
    if (schema.enums) {
      for (const [field, allowedValues] of Object.entries(schema.enums)) {
        const value = req.body[field];
        if (value !== undefined && !allowedValues.includes(value)) {
          errors.push(`${field} must be one of: ${allowedValues.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    errorType: ErrorTypes.NOT_FOUND
  });
};

module.exports = {
  ApiError,
  ErrorTypes,
  errorHandler,
  asyncHandler,
  validateRequest,
  notFoundHandler,
  createErrorResponse
};

