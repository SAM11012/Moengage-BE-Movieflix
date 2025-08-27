const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");

// Import configurations and utilities
const config = require("./config/env");
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const responseHandler = require("./utils/responseHandler");

// Import routes
const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");
const analyticsRoutes = require("./routes/analytics");

// Import services
const cacheService = require("./services/cacheService");

// Create Express app
const app = express();

// Connect to database
connectDB();

// Trust proxy (for rate limiting and security headers)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins =
        config.NODE_ENV === "production"
          ? [
              "https://your-frontend-domain.com", // Replace with your actual deployed frontend domain
              "http://localhost:8080", 
              "https://movie-moengage-ovgdpwuh5-sam11012s-projects.vercel.app"           // Allow localhost for testing
            ]
          : [
              "http://localhost:3000",
              "http://localhost:3001",
              "http://localhost:5173",
              "http://localhost:8080",
            ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === "/api/health";
  },
});

app.use("/api", generalLimiter);

// Logging middleware
if (config.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (req) => req.path === "/api/health", // Skip health check logs
    })
  );
}

// Body parsing middleware
app.use(
  express.json({
    limit: "10mb",
    type: ["application/json", "text/plain"],
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader("X-Request-ID", req.id);
  next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    memory: process.memoryUsage(),
    pid: process.pid,
  };

  responseHandler.success(res, healthCheck, "Server is running");
});

// API documentation endpoint
app.get("/api", (req, res) => {
  const apiInfo = {
    name: "MovieFlix Dashboard API",
    version: "1.0.0",
    description:
      "A comprehensive movie database API with search, analytics, and caching capabilities",
    endpoints: {
      auth: "/api/auth - Authentication endpoints",
      movies: "/api/movies - Movie search and management",
      analytics: "/api/analytics - Movie analytics and statistics",
    },
    documentation: "https://github.com/your-repo/movieflix-backend",
    status: "active",
  };

  responseHandler.success(res, apiInfo, "MovieFlix Dashboard API");
});

// 404 handler for API routes
app.all("/api/*", (req, res) => {
  responseHandler.notFound(res, `API route ${req.originalUrl} not found`);
});

// Catch all other routes
app.all("*", (req, res) => {
  responseHandler.notFound(res, `Route ${req.originalUrl} not found`);
});

// Global error handling middleware (must be last)
app.use(errorHandler);

// Scheduled tasks
if (config.NODE_ENV !== "test") {
  // Clean up expired cache entries every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const deletedCount = await cacheService.cleanupExpiredCache();
      logger.info(`Cache cleanup completed: ${deletedCount} entries removed`);
    } catch (error) {
      logger.error("Cache cleanup failed:", error.message);
    }
  });

  // Log system stats every 6 hours in production
  if (config.NODE_ENV === "production") {
    cron.schedule("0 */6 * * *", () => {
      const memUsage = process.memoryUsage();
      logger.info("System Stats:", {
        uptime: process.uptime(),
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        },
        pid: process.pid,
      });
    });
  }
}

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      logger.error("Error during server shutdown:", err.message);
      process.exit(1);
    }

    logger.info("HTTP server closed");

    // Close database connections
    require("mongoose").connection.close(() => {
      logger.info("Database connection closed");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", {
    message: err.message,
    stack: err.stack,
  });

  if (config.NODE_ENV === "production") {
    gracefulShutdown("unhandledRejection");
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", {
    message: err.message,
    stack: err.stack,
  });

  gracefulShutdown("uncaughtException");
});

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${config.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📊 API Documentation: http://localhost:${PORT}/api`);
  logger.info(`💚 Health Check: http://localhost:${PORT}/api/health`);
});

// Set server timeout
server.timeout = 30000; // 30 seconds

module.exports = app;
