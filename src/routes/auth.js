const express = require("express");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validateRequest, schemas } = require("../middleware/validation");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// Apply auth rate limiter to all auth routes
router.use(rateLimiter.auth);

// Public routes
router.post(
  "/register",
  validateRequest(schemas.register),
  authController.register
);
router.post("/login", validateRequest(schemas.login), authController.login);
router.post("/forgot-password", authController.forgotPassword);

// Protected routes
router.use(authenticate);
router.get("/profile", authController.getProfile);
router.post("/change-password", authController.changePassword);
router.post("/logout", authController.logout);

module.exports = router;
