require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  OMDB_API_KEY: process.env.OMDB_API_KEY,
  CACHE_EXPIRE_HOURS: parseInt(process.env.CACHE_EXPIRE_HOURS) || 24,
  RATE_LIMIT: {
    MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  },
};
