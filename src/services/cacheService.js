const Cache = require('../models/Cache');
const config = require('../config/env');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultExpiryHours = config.CACHE_EXPIRE_HOURS;
  }

  generateKey(prefix, params) {
    const paramsString = JSON.stringify(params);
    return `${prefix}:${Buffer.from(paramsString).toString('base64')}`;
  }

  async get(key) {
    try {
      const cached = await Cache.findOne({ 
        key, 
        expiresAt: { $gt: new Date() } 
      });
      
      if (cached) {
        logger.debug(`Cache hit for key: ${key}`);
        return cached.data;
      }
      
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error.message);
      return null;
    }
  }

  async set(key, data, expiryHours = null) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (expiryHours || this.defaultExpiryHours));

      await Cache.findOneAndUpdate(
        { key },
        { data, expiresAt },
        { upsert: true, new: true }
      );

      logger.debug(`Cache set for key: ${key}, expires at: ${expiresAt}`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error.message);
      return false;
    }
  }

  async delete(key) {
    try {
      await Cache.deleteOne({ key });
      logger.debug(`Cache deleted for key: ${key}`);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error.message);
      return false;
    }
  }

  async cleanupExpiredCache() {
    try {
      const result = await Cache.deleteMany({ 
        expiresAt: { $lt: new Date() } 
      });
      
      logger.info(`Cleaned up ${result.deletedCount} expired cache entries`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Cache cleanup error:', error.message);
      return 0;
    }
  }

  async getStats() {
    try {
      const totalCount = await Cache.countDocuments();
      const expiredCount = await Cache.countDocuments({ 
        expiresAt: { $lt: new Date() } 
      });
      
      return {
        total: totalCount,
        expired: expiredCount,
        active: totalCount - expiredCount
      };
    } catch (error) {
      logger.error('Cache stats error:', error.message);
      return { total: 0, expired: 0, active: 0 };
    }
  }
}

module.exports = new CacheService();