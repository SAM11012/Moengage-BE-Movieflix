const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const config = require("../config/env");
const logger = require("../utils/logger");

class AuthService {
  generateToken(userId) {
    return jwt.sign({ id: userId }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRE,
    });
  }

  async registerUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("User already exists with this email");
      }

      // Create new user
      const user = new User(userData);
      await user.save();

      // Generate token
      const token = this.generateToken(user._id);

      logger.info(`New user registered: ${user.email}`);

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      };
    } catch (error) {
      logger.error("Registration error:", error.message);
      throw error;
    }
  }

  async loginUser(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check if user is locked
      if (user.isLocked()) {
        throw new Error(
          "Account temporarily locked due to too many failed login attempts"
        );
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error("Account is deactivated");
      }

      // Validate password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Increment login attempts
        user.loginAttempts += 1;

        // Lock account after 5 failed attempts for 30 minutes
        if (user.loginAttempts >= 5) {
          user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
          logger.warn(`Account locked for user: ${email}`);
        }

        await user.save();
        throw new Error("Invalid credentials");
      }

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = this.generateToken(user._id);

      logger.info(`User logged in: ${user.email}`);

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
        },
      };
    } catch (error) {
      logger.error("Login error:", error.message);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new Error("User not found");
      }

      // Validate current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);
      return true;
    } catch (error) {
      logger.error("Change password error:", error.message);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId).select("-password");
      if (!user) {
        throw new Error("User not found");
      }
      return user;
    } catch (error) {
      logger.error("Get user profile error:", error.message);
      throw error;
    }
  }

  // Update password by email (for forgot password flow)
  async updatePasswordByEmail(email, newPassword) {
    try {
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        throw new Error("User not found with this email");
      }
      // Hash the new password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = newPassword
      await user.save();
      logger.info(`Password updated for user: ${user.email}`);
      return true;
    } catch (error) {
      logger.error("Update password by email error:", error.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
