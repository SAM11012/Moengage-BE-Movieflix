const express = require("express");
const movieController = require("../controllers/movieController");
const { authenticate, authorize } = require("../middleware/auth");
const { validateRequest, schemas } = require("../middleware/validation");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// Public routes with rate limiting
router.get("/search", rateLimiter.search, movieController.searchMovies);
router.get("/all", movieController.getAllMovies);
router.get("/trending", movieController.getTrendingMovies);
router.get("/:id", movieController.getMovieById);

// Protected routes (require authentication)
router.use(authenticate);

// Admin-only routes
router.delete("/:id", authorize("admin"), movieController.deleteMovie);
router.put("/:id", authorize("admin"), movieController.updateMovie);

module.exports = router;
