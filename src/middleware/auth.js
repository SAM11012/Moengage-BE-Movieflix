const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const responseHandler = require('../utils/responseHandler');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return responseHandler.unauthorized(res, 'Access token required');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return responseHandler.unauthorized(res, 'User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    return responseHandler.unauthorized(res, 'Invalid token');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return responseHandler.unauthorized(res, 'User not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      return responseHandler.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

module.exports = { authenticate, authorize };