const faceService = require('../services/face.service');
const similarityService = require('../services/similarity.service');
const getUserEmbeddingModel = require('../models/userEmbedding.model');
const ResponseHelper = require('../utils/response');
const logger = require('../utils/logger');
const { catchAsync, ValidationError } = require('../utils/errorHandler');

/**
 * Compare endpoint controller - handles face verification
 * POST /compare
 */
const compareFace = catchAsync(async (req, res) => {
  try {
    // Check if model is loaded
    if (!faceService.isModelLoaded()) {
      return ResponseHelper.modelNotLoaded(res);
    }

    // Validate request
    if (!req.file) {
      return ResponseHelper.badRequest(res, 'No image file provided');
    }

    if (!req.body.storedEmbedding) {
      return ResponseHelper.badRequest(res, 'Stored embedding is required');
    }

    logger.info('Processing face comparison request', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      hasStoredEmbedding: !!req.body.storedEmbedding
    });

    // Parse stored embedding
    let storedEmbedding;
    try {
      storedEmbedding = similarityService.parseEmbeddingString(req.body.storedEmbedding);
    } catch (error) {
      return ResponseHelper.invalidEmbeddingFormat(res);
    }

    // Process new image and generate embedding
    const result = await faceService.processImageAndGenerateEmbedding(req.file.buffer);
    const newEmbedding = result.embedding;

    // Compare embeddings
    const comparisonResult = similarityService.compareEmbeddings(
      newEmbedding, 
      storedEmbedding,
      req.body.threshold ? parseFloat(req.body.threshold) : null
    );

    // Log comparison result
    logger.info('Face comparison completed', {
      isMatch: comparisonResult.isMatch,
      similarity: comparisonResult.similarity,
      threshold: comparisonResult.threshold,
      confidence: comparisonResult.confidence
    });

    // Return comparison result
    return ResponseHelper.compareSuccess(
      res, 
      comparisonResult.isMatch, 
      comparisonResult.similarity
    );
    
  } catch (error) {
    logger.error('Face comparison failed:', error);
    
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
      return ResponseHelper.internalServerError(res, 'Face comparison failed', error);
    }
  }
});

/**
 * Compare face against stored user embedding by userId
 * POST /compare/:userId
 */
const compareFaceByUserId = catchAsync(async (req, res) => {
  try {
    // Check if model is loaded
    if (!faceService.isModelLoaded()) {
      return ResponseHelper.modelNotLoaded(res);
    }

    // Validate request
    if (!req.file) {
      return ResponseHelper.badRequest(res, 'No image file provided');
    }

    const { userId } = req.params;
    
    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    logger.info('Processing face comparison request by userId', {
      userId,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Get stored embedding for user
    const UserEmbedding = getUserEmbeddingModel();
    const userEmbedding = await UserEmbedding.findByUserId(userId);
    
    if (!userEmbedding) {
      return ResponseHelper.embeddingNotFound(res);
    }

    // Process new image and generate embedding
    const result = await faceService.processImageAndGenerateEmbedding(req.file.buffer);
    const newEmbedding = result.embedding;

    // Compare embeddings
    const comparisonResult = similarityService.compareEmbeddings(
      newEmbedding, 
      userEmbedding.embedding,
      req.body.threshold ? parseFloat(req.body.threshold) : null
    );

    // Log comparison result
    logger.info('Face comparison by userId completed', {
      userId,
      isMatch: comparisonResult.isMatch,
      similarity: comparisonResult.similarity,
      threshold: comparisonResult.threshold,
      confidence: comparisonResult.confidence
    });

    // Return comparison result with additional metadata
    return ResponseHelper.success(res, {
      isMatch: comparisonResult.isMatch,
      similarity: comparisonResult.similarity,
      threshold: comparisonResult.threshold,
      confidence: comparisonResult.confidence,
      userId: userId,
      storedEmbeddingMetadata: userEmbedding.metadata
    }, 'Face comparison completed');
    
  } catch (error) {
    logger.error('Face comparison by userId failed:', error);
    
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
      return ResponseHelper.internalServerError(res, 'Face comparison failed', error);
    }
  }
});

/**
 * Batch compare multiple faces against stored embeddings
 * POST /compare/batch
 */
const batchCompareFaces = catchAsync(async (req, res) => {
  try {
    // Check if model is loaded
    if (!faceService.isModelLoaded()) {
      return ResponseHelper.modelNotLoaded(res);
    }

    // Validate request
    if (!req.files || req.files.length === 0) {
      return ResponseHelper.badRequest(res, 'No image files provided');
    }

    if (!req.body.storedEmbeddings) {
      return ResponseHelper.badRequest(res, 'Stored embeddings are required');
    }

    logger.info('Processing batch face comparison request', {
      imageCount: req.files.length,
      hasStoredEmbeddings: !!req.body.storedEmbeddings
    });

    // Parse stored embeddings
    let storedEmbeddings;
    try {
      storedEmbeddings = JSON.parse(req.body.storedEmbeddings);
      if (!Array.isArray(storedEmbeddings)) {
        throw new Error('Stored embeddings must be an array');
      }
    } catch (error) {
      return ResponseHelper.badRequest(res, 'Invalid stored embeddings format');
    }

    const results = [];

    // Process each image
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // Process image and generate embedding
        const result = await faceService.processImageAndGenerateEmbedding(file.buffer);
        const newEmbedding = result.embedding;

        // Compare with all stored embeddings
        const comparisons = storedEmbeddings.map((storedEmbedding, index) => {
          try {
            const parsedEmbedding = similarityService.parseEmbeddingString(
              typeof storedEmbedding === 'string' ? storedEmbedding : JSON.stringify(storedEmbedding)
            );
            
            const comparisonResult = similarityService.compareEmbeddings(
              newEmbedding, 
              parsedEmbedding,
              req.body.threshold ? parseFloat(req.body.threshold) : null
            );

            return {
              embeddingIndex: index,
              isMatch: comparisonResult.isMatch,
              similarity: comparisonResult.similarity,
              confidence: comparisonResult.confidence
            };
          } catch (error) {
            logger.warn(`Failed to compare with embedding ${index}:`, error);
            return {
              embeddingIndex: index,
              isMatch: false,
              similarity: 0,
              confidence: 0,
              error: 'Invalid embedding format'
            };
          }
        });

        results.push({
          imageIndex: i,
          filename: file.originalname,
          comparisons: comparisons,
          bestMatch: comparisons.reduce((best, current) => 
            current.similarity > best.similarity ? current : best
          )
        });

      } catch (error) {
        logger.warn(`Failed to process image ${i}:`, error);
        results.push({
          imageIndex: i,
          filename: file.originalname,
          error: error.message,
          comparisons: []
        });
      }
    }

    logger.info('Batch face comparison completed', {
      processedImages: results.length,
      successfulComparisons: results.filter(r => !r.error).length
    });

    return ResponseHelper.success(res, {
      results: results,
      summary: {
        totalImages: results.length,
        successfulComparisons: results.filter(r => !r.error).length,
        failedComparisons: results.filter(r => r.error).length
      }
    }, 'Batch face comparison completed');
    
  } catch (error) {
    logger.error('Batch face comparison failed:', error);
    return ResponseHelper.internalServerError(res, 'Batch face comparison failed', error);
  }
});

module.exports = {
  compareFace,
  compareFaceByUserId,
  batchCompareFaces
};
