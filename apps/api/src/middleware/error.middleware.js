const { AppError } = require('../core/errors/AppError');
const { logger } = require('../core/logger/logger');
const env = require('../config/environment');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid value for ${err.path}: ${err.value}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle MongoDB Duplicate Key (11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    message = `${field} already exists with value '${err.keyValue[field]}'`;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Log error with request context (redacting sensitive data)
  logger.error(message, {
    code,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    tenantId: req.tenantId || null,
    userId: req.user ? req.user._id : null,
    stack: !env.IS_PRODUCTION ? err.stack : undefined
  });

  const response = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details) {
    response.error.details = details;
  }

  if (!env.IS_PRODUCTION && statusCode === 500) {
    response.error.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  errorHandler
};
