const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const responseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

class AnalyticsController {
  async getDashboardStats(req, res) {
    try {
      const cacheKey = cacheService.generateKey('dashboard_stats', {});
      
      // Try to get from cache first
      let cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) {
        return responseHandler.success(res, cachedStats, 'Dashboard stats retrieved from cache');
      }

      // Fetch all analytics data
      const [
        overallStats,
        genreDistribution,
        ratingDistribution,
        yearlyStats,
        topMovies,
        searchTrends
      ] = await Promise.all([
        analyticsService.getOverallStats(),
        analyticsService.getGenreDistribution(),
        analyticsService.getRatingDistribution(),
        analyticsService.getYearlyStats(),
        analyticsService.getTopMovies(10),
        analyticsService.getSearchTrends()
      ]);

      const dashboardData = {
        overview: overallStats,
        genres: genreDistribution,
        ratings: ratingDistribution,
        yearly: yearlyStats,
        topMovies,
        searchTrends,
        generatedAt: new Date().toISOString()
      };

      // Cache for 30 minutes
      await cacheService.set(cacheKey, dashboardData, 0.5);

      responseHandler.success(res, dashboardData, 'Dashboard stats retrieved successfully');

    } catch (error) {
      logger.error('Dashboard stats error:', error.message);
      responseHandler.error(res, 'Failed to retrieve dashboard stats', 500);
    }
  }

  async getGenreAnalytics(req, res) {
    try {
      const genreDistribution = await analyticsService.getGenreDistribution();
      responseHandler.success(res, genreDistribution, 'Genre analytics retrieved successfully');
    } catch (error) {
      logger.error('Genre analytics error:', error.message);
      responseHandler.error(res, 'Failed to retrieve genre analytics', 500);
    }
  }

  async getRatingAnalytics(req, res) {
    try {
      const ratingDistribution = await analyticsService.getRatingDistribution();
      responseHandler.success(res, ratingDistribution, 'Rating analytics retrieved successfully');
    } catch (error) {
      logger.error('Rating analytics error:', error.message);
      responseHandler.error(res, 'Failed to retrieve rating analytics', 500);
    }
  }

  async getYearlyAnalytics(req, res) {
    try {
      const yearlyStats = await analyticsService.getYearlyStats();
      responseHandler.success(res, yearlyStats, 'Yearly analytics retrieved successfully');
    } catch (error) {
      logger.error('Yearly analytics error:', error.message);
      responseHandler.error(res, 'Failed to retrieve yearly analytics', 500);
    }
  }

  async getTopMovies(req, res) {
    try {
      const { limit = 10, sortBy = 'rating' } = req.query;
      const topMovies = await analyticsService.getTopMovies(parseInt(limit), sortBy);
      responseHandler.success(res, topMovies, 'Top movies retrieved successfully');
    } catch (error) {
      logger.error('Top movies error:', error.message);
      responseHandler.error(res, 'Failed to retrieve top movies', 500);
    }
  }

  async getSearchTrends(req, res) {
    try {
      const searchTrends = await analyticsService.getSearchTrends();
      responseHandler.success(res, searchTrends, 'Search trends retrieved successfully');
    } catch (error) {
      logger.error('Search trends error:', error.message);
      responseHandler.error(res, 'Failed to retrieve search trends', 500);
    }
  }

  async getCacheStats(req, res) {
    try {
      const cacheStats = await cacheService.getStats();
      responseHandler.success(res, cacheStats, 'Cache stats retrieved successfully');
    } catch (error) {
      logger.error('Cache stats error:', error.message);
      responseHandler.error(res, 'Failed to retrieve cache stats', 500);
    }
  }
}

module.exports = new AnalyticsController();