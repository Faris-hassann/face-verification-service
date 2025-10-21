require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'face_verification_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  
  // Model Configuration
  model: {
    path: process.env.MODEL_PATH || './src/models_files/face_model.onnx',
    inputSize: parseInt(process.env.MODEL_INPUT_SIZE) || 112,
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION) || 512,
  },
  
  // Face Detection Configuration
  faceDetection: {
    threshold: parseFloat(process.env.FACE_DETECTION_THRESHOLD) || 0.5,
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.6,
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES?.split(',') || 
      ['image/jpeg', 'image/png', 'image/jpg'],
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
  
  // Security Configuration
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  }
};

module.exports = config;
