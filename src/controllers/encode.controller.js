const faceService = require('../services/face.service');
const imageService = require('../services/image.service');
const UserEmbedding = require('../models/userEmbedding.model');
const ResponseHelper = require('../utils/response');
const logger = require('../utils/logger');
const { catchAsync, ValidationError } = require('../utils/errorHandler');
const { v4: uuidv4 } = require('uuid');

/**
 * Encode endpoint controller - handles user registration
 * POST /encode
 */
const encodeFace = catchAsync(async (req, res) => {
  try {
    // Check if model is loaded
    if (!faceService.isModelLoaded()) {
      return ResponseHelper.modelNotLoaded(res);
    }

    // Validate request
    if (!req.file) {
      return ResponseHelper.badRequest(res, 'No image file provided');
    }

    logger.info('Processing face encoding request', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Process image and generate embedding
    const result = await faceService.processImageAndGenerateEmbedding(req.file.buffer);
    
    // Generate image hash for verification
    const imageHash = await imageService.generateImageHash(req.file.buffer);
    
    // Generate unique user ID if not provided
    const userId = req.body.userId || uuidv4();
    
    // Prepare metadata
    const metadata = {
      originalFilename: req.file.originalname,
      imageSize: req.file.size,
      imageMimeType: req.file.mimetype,
      faceRegion: result.faceRegion,
      processedAt: new Date().toISOString(),
      modelInfo: faceService.getModelInfo()
    };

    // Check if user already exists
    const existingUser = await UserEmbedding.findByUserId(userId);
    
    if (existingUser) {
      // Update existing user embedding
      await UserEmbedding.updateEmbedding(userId, result.embedding, imageHash, metadata);
      logger.info(`Updated embedding for existing user: ${userId}`);
    } else {
      // Create new user embedding
      await UserEmbedding.createEmbedding(userId, result.embedding, imageHash, metadata);
      logger.info(`Created new embedding for user: ${userId}`);
    }

    // Return success response
    return ResponseHelper.encodeSuccess(res, result.embedding);
    
  } catch (error) {
    logger.error('Face encoding failed:', error);
    
    // Handle specific error types
    if (error.name === 'ImageProcessingError') {
      if (error.message.includes('No face detected')) {
        return ResponseHelper.noFaceDetected(res);
      } else if (error.message.includes('Multiple faces')) {
        return ResponseHelper.multipleFacesDetected(res);
      } else if (error.message.includes('Invalid image format')) {
        return ResponseHelper.invalidImageFormat(res);
      } else if (error.message.includes('too large')) {
        return ResponseHelper.imageTooLarge(res);
      } else {
        return ResponseHelper.imageProcessingFailed(res, error);
      }
    } else if (error.name === 'ModelInferenceError') {
      return ResponseHelper.internalServerError(res, 'Failed to process face data', error);
    } else if (error.name === 'ValidationError') {
      return ResponseHelper.badRequest(res, error.message);
    } else {
      return ResponseHelper.internalServerError(res, 'Face encoding failed', error);
    }
  }
});

/**
 * Get user embedding by ID
 * GET /encode/:userId
 */
const getUserEmbedding = catchAsync(async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const userEmbedding = await UserEmbedding.findByUserId(userId);
    
    if (!userEmbedding) {
      return ResponseHelper.embeddingNotFound(res);
    }

    return ResponseHelper.success(res, {
      userId: userEmbedding.userId,
      embedding: userEmbedding.embedding,
      metadata: userEmbedding.metadata,
      createdAt: userEmbedding.createdAt
    }, 'User embedding retrieved successfully');
    
  } catch (error) {
    logger.error('Failed to get user embedding:', error);
    return ResponseHelper.internalServerError(res, 'Failed to retrieve user embedding', error);
  }
});

/**
 * Delete user embedding
 * DELETE /encode/:userId
 */
const deleteUserEmbedding = catchAsync(async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const deleted = await UserEmbedding.deactivateEmbedding(userId);
    
    if (!deleted) {
      return ResponseHelper.embeddingNotFound(res);
    }

    logger.info(`Deactivated embedding for user: ${userId}`);
    return ResponseHelper.success(res, null, 'User embedding deleted successfully');
    
  } catch (error) {
    logger.error('Failed to delete user embedding:', error);
    return ResponseHelper.internalServerError(res, 'Failed to delete user embedding', error);
  }
});

/**
 * List all user embeddings
 * GET /encode
 */
const listUserEmbeddings = catchAsync(async (req, res) => {
  try {
    const embeddings = await UserEmbedding.getAllActiveEmbeddings();
    
    const responseData = embeddings.map(embedding => ({
      userId: embedding.userId,
      metadata: embedding.metadata,
      createdAt: embedding.createdAt
    }));

    return ResponseHelper.success(res, {
      count: responseData.length,
      embeddings: responseData
    }, 'User embeddings retrieved successfully');
    
  } catch (error) {
    logger.error('Failed to list user embeddings:', error);
    return ResponseHelper.internalServerError(res, 'Failed to retrieve user embeddings', error);
  }
});

module.exports = {
  encodeFace,
  getUserEmbedding,
  deleteUserEmbedding,
  listUserEmbeddings
};
