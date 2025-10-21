const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const config = require('./config/env.config');
const { globalErrorHandler } = require('./utils/errorHandler');
const routes = require('./routes');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMaxRequests,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many requests from this IP, please try again later.'
        });
      }
    });

    this.app.use('/api', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        logger.logRequest(req, res, responseTime);
      });
      
      next();
    });

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Face Verification Service API',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/api/health'
      });
    });

    // 404 handler for non-API routes
    this.app.use('*', (req, res) => {
      logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use(globalErrorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.logError(err, { type: 'uncaughtException' });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.logError(err, { type: 'unhandledRejection' });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  async shutdown() {
    try {
      logger.info('Starting graceful shutdown...');
      
      // Close database connections
      const dbConfig = require('./config/db.config');
      await dbConfig.close();
      
      // Dispose face service
      const faceService = require('./services/face.service');
      await faceService.dispose();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;
