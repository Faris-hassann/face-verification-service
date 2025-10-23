const App = require('./app');
const dbConfig = require('./config/db.config');
const faceService = require('./services/face.service');
const logger = require('./utils/logger');
const config = require('./config/env.config');

class Server {
  constructor() {
    this.app = null;
    this.server = null;
  }

  async start() {
    try {
      logger.info('Starting Face Verification Service...');
      
      // Initialize database FIRST
      logger.info('Connecting to database...');
      await dbConfig.connect();
      await dbConfig.sync(true); // Don't force sync in production
      logger.info('Database connected and synchronized');

      // Initialize face service
      logger.info('Initializing face recognition model...');
      await faceService.initialize();
      logger.info('Face recognition model initialized');

      // Create App AFTER database is connected
      logger.info('Initializing Express application...');
      this.app = new App();

      // Start HTTP server
      const port = config.port;
      this.server = this.app.getApp().listen(port, () => {
        logger.info(`Face Verification Service started on port ${port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`API Documentation: http://localhost:${port}/api/docs`);
        logger.info(`Health Check: http://localhost:${port}/api/health`);
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use`);
        } else {
          logger.error('Server error:', error);
        }
        process.exit(1);
      });

      return this.server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  async shutdown() {
    try {
      logger.info('Shutting down server...');
      
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP server closed');
      }

      // Close database connections
      await dbConfig.close();
      logger.info('Database connections closed');

      // Dispose face service
      await faceService.dispose();
      logger.info('Face service disposed');

      logger.info('Server shutdown completed');
    } catch (error) {
      logger.error('Error during server shutdown:', error);
      throw error;
    }
  }

  getServer() {
    return this.server;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = Server;
