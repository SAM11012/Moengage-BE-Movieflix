const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    return responseHandler.notFound(res, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    return responseHandler.error(res, message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    return responseHandler.validationError(res, errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return responseHandler.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return responseHandler.unauthorized(res, 'Token expired');
  }

  return responseHandler.error(res, error.message || 'Server Error', error.statusCode || 500);
};

module.exports = errorHandler;