const rateLimit = require("express-rate-limit");
const config = require("../config/env");

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || "Too many requests, please try again later.",
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && req.user.role === "admin";
    },
  });
};

module.exports = {
  general: createRateLimiter(
    config.RATE_LIMIT.WINDOW_MS,
    config.RATE_LIMIT.MAX
  ),
  auth: createRateLimiter(1 * 60 * 1000, 5, "Too many authentication attempts"),
  search: createRateLimiter(2 * 60 * 1000, 10, "Too many search requests"),
};
