const logger = require('../utils/logger');
const config = require('../config/env.config');
const { ValidationError } = require('../utils/errorHandler');

class SimilarityService {
  constructor() {
    this.similarityThreshold = config.faceDetection.similarityThreshold;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {number} Cosine similarity score (0-1)
   */
  calculateCosineSimilarity(embedding1, embedding2) {
    try {
      // Validate inputs
      if (!this.validateEmbeddings(embedding1, embedding2)) {
        throw new ValidationError('Invalid embedding vectors provided');
      }

      // Ensure vectors have the same length
      if (embedding1.length !== embedding2.length) {
        throw new ValidationError('Embedding vectors must have the same length');
      }

      // Calculate dot product
      let dotProduct = 0;
      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
      }

      // Calculate magnitudes
      const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

      // Avoid division by zero
      if (magnitude1 === 0 || magnitude2 === 0) {
        logger.warn('Zero magnitude embedding vector detected');
        return 0;
      }

      // Calculate cosine similarity
      const similarity = dotProduct / (magnitude1 * magnitude2);
      
      // Clamp to [0, 1] range
      const clampedSimilarity = Math.max(0, Math.min(1, similarity));
      
      logger.debug(`Cosine similarity calculated: ${clampedSimilarity.toFixed(6)}`);
      return clampedSimilarity;
    } catch (error) {
      logger.error('Failed to calculate cosine similarity:', error);
      throw error;
    }
  }

  /**
   * Calculate Euclidean distance between two embedding vectors
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {number} Euclidean distance
   */
  calculateEuclideanDistance(embedding1, embedding2) {
    try {
      if (!this.validateEmbeddings(embedding1, embedding2)) {
        throw new ValidationError('Invalid embedding vectors provided');
      }

      if (embedding1.length !== embedding2.length) {
        throw new ValidationError('Embedding vectors must have the same length');
      }

      let sumSquaredDiffs = 0;
      for (let i = 0; i < embedding1.length; i++) {
        const diff = embedding1[i] - embedding2[i];
        sumSquaredDiffs += diff * diff;
      }

      const distance = Math.sqrt(sumSquaredDiffs);
      logger.debug(`Euclidean distance calculated: ${distance.toFixed(6)}`);
      return distance;
    } catch (error) {
      logger.error('Failed to calculate Euclidean distance:', error);
      throw error;
    }
  }

  /**
   * Calculate Manhattan distance between two embedding vectors
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {number} Manhattan distance
   */
  calculateManhattanDistance(embedding1, embedding2) {
    try {
      if (!this.validateEmbeddings(embedding1, embedding2)) {
        throw new ValidationError('Invalid embedding vectors provided');
      }

      if (embedding1.length !== embedding2.length) {
        throw new ValidationError('Embedding vectors must have the same length');
      }

      let sumAbsDiffs = 0;
      for (let i = 0; i < embedding1.length; i++) {
        sumAbsDiffs += Math.abs(embedding1[i] - embedding2[i]);
      }

      logger.debug(`Manhattan distance calculated: ${sumAbsDiffs.toFixed(6)}`);
      return sumAbsDiffs;
    } catch (error) {
      logger.error('Failed to calculate Manhattan distance:', error);
      throw error;
    }
  }

  /**
   * Compare two embeddings and determine if they match
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @param {number} threshold - Similarity threshold (optional)
   * @returns {Object} Comparison result
   */
  compareEmbeddings(embedding1, embedding2, threshold = null) {
    try {
      const similarityThreshold = threshold || this.similarityThreshold;
      
      // Calculate cosine similarity
      const cosineSimilarity = this.calculateCosineSimilarity(embedding1, embedding2);
      
      // Calculate other distance metrics for additional insights
      const euclideanDistance = this.calculateEuclideanDistance(embedding1, embedding2);
      const manhattanDistance = this.calculateManhattanDistance(embedding1, embedding2);
      
      // Determine if embeddings match based on threshold
      const isMatch = cosineSimilarity >= similarityThreshold;
      
      const result = {
        isMatch: isMatch,
        similarity: cosineSimilarity,
        euclideanDistance: euclideanDistance,
        manhattanDistance: manhattanDistance,
        threshold: similarityThreshold,
        confidence: this.calculateConfidence(cosineSimilarity, similarityThreshold)
      };

      logger.info(`Face comparison result: ${isMatch ? 'MATCH' : 'NO MATCH'} (similarity: ${cosineSimilarity.toFixed(4)}, threshold: ${similarityThreshold})`);
      
      return result;
    } catch (error) {
      logger.error('Failed to compare embeddings:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score based on similarity and threshold
   * @param {number} similarity - Cosine similarity score
   * @param {number} threshold - Similarity threshold
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(similarity, threshold) {
    try {
      if (similarity >= threshold) {
        // For matches, confidence increases with similarity above threshold
        const excessSimilarity = similarity - threshold;
        const maxExcess = 1 - threshold;
        return Math.min(1, threshold + (excessSimilarity / maxExcess) * (1 - threshold));
      } else {
        // For non-matches, confidence decreases as similarity approaches threshold
        return similarity / threshold;
      }
    } catch (error) {
      logger.error('Failed to calculate confidence:', error);
      return 0;
    }
  }

  /**
   * Validate embedding vectors
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {boolean} True if both embeddings are valid
   */
  validateEmbeddings(embedding1, embedding2) {
    try {
      // Check if both are arrays
      if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
        return false;
      }

      // Check if both have content
      if (embedding1.length === 0 || embedding2.length === 0) {
        return false;
      }

      // Check if all values are numbers
      const isValid1 = embedding1.every(val => typeof val === 'number' && !isNaN(val));
      const isValid2 = embedding2.every(val => typeof val === 'number' && !isNaN(val));

      return isValid1 && isValid2;
    } catch (error) {
      logger.error('Failed to validate embeddings:', error);
      return false;
    }
  }

  /**
   * Parse embedding string to array
   * @param {string} embeddingString - JSON string representation of embedding
   * @returns {Array} Parsed embedding array
   */
  parseEmbeddingString(embeddingString) {
    try {
      if (typeof embeddingString !== 'string') {
        throw new ValidationError('Embedding must be a JSON string');
      }

      const embedding = JSON.parse(embeddingString);
      
      if (!Array.isArray(embedding)) {
        throw new ValidationError('Embedding must be an array');
      }

      if (embedding.length === 0) {
        throw new ValidationError('Embedding array cannot be empty');
      }

      // Validate all values are numbers
      if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
        throw new ValidationError('All embedding values must be valid numbers');
      }

      logger.debug(`Successfully parsed embedding with ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to parse embedding string:', error);
      throw new ValidationError('Invalid embedding format. Please provide a valid JSON array of numbers.');
    }
  }

  /**
   * Get similarity threshold
   * @returns {number} Current similarity threshold
   */
  getSimilarityThreshold() {
    return this.similarityThreshold;
  }

  /**
   * Set similarity threshold
   * @param {number} threshold - New similarity threshold
   */
  setSimilarityThreshold(threshold) {
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new ValidationError('Similarity threshold must be a number between 0 and 1');
    }
    
    this.similarityThreshold = threshold;
    logger.info(`Similarity threshold updated to: ${threshold}`);
  }
}

module.exports = new SimilarityService();
