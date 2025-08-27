const authService = require("../services/authService");
const responseHandler = require("../utils/responseHandler");
const logger = require("../utils/logger");

class AuthController {
  async register(req, res) {
    try {
      const result = await authService.registerUser(req.body);
      responseHandler.success(res, result, "User registered successfully", 201);
    } catch (error) {
      if (error.message === "User already exists with this email") {
        return responseHandler.error(res, error.message, 400);
      }
      responseHandler.error(res, "Registration failed", 500);
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginUser(email, password);
      responseHandler.success(res, result, "Login successful");
    } catch (error) {
      const statusCode = error.message.includes("locked") ? 423 : 401;
      responseHandler.error(res, error.message, statusCode);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await authService.getUserProfile(req.user.id);
      responseHandler.success(res, user, "Profile retrieved successfully");
    } catch (error) {
      responseHandler.error(res, "Failed to retrieve profile", 500);
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );
      responseHandler.success(res, null, "Password changed successfully");
    } catch (error) {
      const statusCode =
        error.message === "Current password is incorrect" ? 400 : 500;
      responseHandler.error(res, error.message, statusCode);
    }
  }

  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side by removing the token
      // Here we can log the logout event
      logger.info(`User logged out: ${req.user.email}`);
      responseHandler.success(res, null, "Logout successful");
    } catch (error) {
      responseHandler.error(res, "Logout failed", 500);
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email, newPassword } = req.body;
      await authService.updatePasswordByEmail(email, newPassword);
      responseHandler.success(res, null, "Password changed successfully");
    } catch (error) {
      const statusCode =
        error.message === "User not found with this email" ? 400 : 500;
      responseHandler.error(res, error.message, statusCode);
    }
  }
}

module.exports = new AuthController();
