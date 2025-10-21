const express = require('express');
const encodeRoutes = require('./encode.routes');
const compareRoutes = require('./compare.routes');
const ResponseHelper = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  logger.debug('Health check requested', healthCheck);
  ResponseHelper.success(res, healthCheck, 'Service is healthy');
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  const apiDocs = {
    name: 'Face Verification Service',
    version: '1.0.0',
    description: 'AI-powered face verification microservice using ONNX models',
    endpoints: {
      encode: {
        'POST /api/encode': 'Encode face and store embedding',
        'GET /api/encode': 'List all user embeddings',
        'GET /api/encode/:userId': 'Get specific user embedding',
        'DELETE /api/encode/:userId': 'Delete user embedding'
      },
      compare: {
        'POST /api/compare': 'Compare face against provided embedding',
        'POST /api/compare/:userId': 'Compare face against stored user embedding',
        'POST /api/compare/batch': 'Batch compare multiple faces'
      }
    },
    requestFormats: {
      encode: {
        method: 'POST',
        contentType: 'multipart/form-data',
        fields: {
          image: 'Image file (JPEG/PNG)',
          userId: 'User ID (optional, auto-generated if not provided)'
        }
      },
      compare: {
        method: 'POST',
        contentType: 'multipart/form-data',
        fields: {
          image: 'Image file (JPEG/PNG)',
          storedEmbedding: 'JSON string of stored embedding array',
          threshold: 'Similarity threshold (optional, default: 0.6)'
        }
      }
    },
    responseFormats: {
      success: {
        success: true,
        data: 'Response data',
        message: 'Success message'
      },
      error: {
        success: false,
        error: 'Error message'
      }
    }
  };
  
  ResponseHelper.success(res, apiDocs, 'API documentation');
});

// Mount route modules
router.use('/encode', encodeRoutes);
router.use('/compare', compareRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  logger.warn(`API route not found: ${req.method} ${req.originalUrl}`);
  ResponseHelper.notFound(res, `API endpoint not found: ${req.method} ${req.originalUrl}`);
});

module.exports = router;
