const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

class DatabaseConfig {
  constructor() {
    this.sequelize = null;
  }

  async connect() {
    try {
      this.sequelize = new Sequelize({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'face_verification_db',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? 
          (msg) => logger.debug(msg) : false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        define: {
          timestamps: true,
          underscored: false
        }
      });

      await this.sequelize.authenticate();
      logger.info('Database connection established successfully');
      
      return this.sequelize;
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  async sync(force = false) {
    try {
      await this.sequelize.sync({ force });
      logger.info('Database synchronized successfully');
    } catch (error) {
      logger.error('Database synchronization failed:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.sequelize.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  getSequelize() {
    return this.sequelize;
  }
}

module.exports = new DatabaseConfig();
