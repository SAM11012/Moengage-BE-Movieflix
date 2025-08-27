const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Public analytics (basic stats)
router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/genres', analyticsController.getGenreAnalytics);
router.get('/ratings', analyticsController.getRatingAnalytics);

// Protected analytics (require authentication)
router.use(authenticate);
router.get('/yearly', analyticsController.getYearlyAnalytics);
router.get('/top-movies', analyticsController.getTopMovies);
router.get('/search-trends', analyticsController.getSearchTrends);

// Admin-only analytics
router.get('/cache-stats', authorize('admin'), analyticsController.getCacheStats);

module.exports = router;