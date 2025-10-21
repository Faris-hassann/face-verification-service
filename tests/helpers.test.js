const similarityService = require('../src/services/similarity.service');
const imageService = require('../src/services/image.service');
const ResponseHelper = require('../src/utils/response');

describe('Utility Functions Tests', () => {
  describe('SimilarityService', () => {
    describe('calculateCosineSimilarity', () => {
      it('should calculate cosine similarity correctly', () => {
        const embedding1 = [1, 0, 0];
        const embedding2 = [1, 0, 0];
        
        const similarity = similarityService.calculateCosineSimilarity(embedding1, embedding2);
        expect(similarity).toBeCloseTo(1, 5);
      });

      it('should calculate cosine similarity for orthogonal vectors', () => {
        const embedding1 = [1, 0, 0];
        const embedding2 = [0, 1, 0];
        
        const similarity = similarityService.calculateCosineSimilarity(embedding1, embedding2);
        expect(similarity).toBeCloseTo(0, 5);
      });

      it('should handle vectors with different magnitudes', () => {
        const embedding1 = [2, 0, 0];
        const embedding2 = [1, 0, 0];
        
        const similarity = similarityService.calculateCosineSimilarity(embedding1, embedding2);
        expect(similarity).toBeCloseTo(1, 5);
      });

      it('should throw error for invalid inputs', () => {
        expect(() => {
          similarityService.calculateCosineSimilarity(null, [1, 2, 3]);
        }).toThrow();

        expect(() => {
          similarityService.calculateCosineSimilarity([1, 2, 3], null);
        }).toThrow();

        expect(() => {
          similarityService.calculateCosineSimilarity([1, 2], [1, 2, 3]);
        }).toThrow();
      });
    });

    describe('parseEmbeddingString', () => {
      it('should parse valid JSON embedding string', () => {
        const embeddingArray = [0.1, 0.2, 0.3, 0.4];
        const embeddingString = JSON.stringify(embeddingArray);
        
        const parsed = similarityService.parseEmbeddingString(embeddingString);
        expect(parsed).toEqual(embeddingArray);
      });

      it('should throw error for invalid JSON', () => {
        expect(() => {
          similarityService.parseEmbeddingString('invalid-json');
        }).toThrow('Invalid embedding format');
      });

      it('should throw error for non-array input', () => {
        expect(() => {
          similarityService.parseEmbeddingString('"not-an-array"');
        }).toThrow('Embedding must be an array');
      });

      it('should throw error for empty array', () => {
        expect(() => {
          similarityService.parseEmbeddingString('[]');
        }).toThrow('Embedding array cannot be empty');
      });

      it('should throw error for non-numeric values', () => {
        expect(() => {
          similarityService.parseEmbeddingString('["not", "numbers"]');
        }).toThrow('All embedding values must be valid numbers');
      });
    });

    describe('compareEmbeddings', () => {
      it('should return match result for similar embeddings', () => {
        const embedding1 = [1, 0, 0];
        const embedding2 = [1, 0, 0];
        
        const result = similarityService.compareEmbeddings(embedding1, embedding2);
        
        expect(result.isMatch).toBe(true);
        expect(result.similarity).toBeCloseTo(1, 5);
        expect(result.confidence).toBeDefined();
      });

      it('should return no match for dissimilar embeddings', () => {
        const embedding1 = [1, 0, 0];
        const embedding2 = [0, 1, 0];
        
        const result = similarityService.compareEmbeddings(embedding1, embedding2);
        
        expect(result.isMatch).toBe(false);
        expect(result.similarity).toBeCloseTo(0, 5);
        expect(result.confidence).toBeDefined();
      });

      it('should use custom threshold when provided', () => {
        const embedding1 = [1, 0, 0];
        const embedding2 = [0.5, 0, 0];
        
        const result = similarityService.compareEmbeddings(embedding1, embedding2, 0.8);
        
        expect(result.threshold).toBe(0.8);
        expect(result.isMatch).toBe(false); // Similarity ~0.5, threshold 0.8
      });
    });
  });

  describe('ImageService', () => {
    describe('validateImageFile', () => {
      it('should validate correct image file', () => {
        const validFile = {
          size: 1024 * 1024, // 1MB
          mimetype: 'image/jpeg'
        };
        
        expect(() => {
          imageService.validateImageFile(validFile);
        }).not.toThrow();
      });

      it('should throw error for file too large', () => {
        const largeFile = {
          size: 20 * 1024 * 1024, // 20MB
          mimetype: 'image/jpeg'
        };
        
        expect(() => {
          imageService.validateImageFile(largeFile);
        }).toThrow('too large');
      });

      it('should throw error for invalid file type', () => {
        const invalidFile = {
          size: 1024 * 1024,
          mimetype: 'text/plain'
        };
        
        expect(() => {
          imageService.validateImageFile(invalidFile);
        }).toThrow('Invalid image format');
      });

      it('should throw error for null file', () => {
        expect(() => {
          imageService.validateImageFile(null);
        }).toThrow('No image file provided');
      });
    });

    describe('generateImageHash', () => {
      it('should generate consistent hash for same image', async () => {
        const imageBuffer = Buffer.from('test-image-data');
        
        const hash1 = await imageService.generateImageHash(imageBuffer);
        const hash2 = await imageService.generateImageHash(imageBuffer);
        
        expect(hash1).toBe(hash2);
        expect(typeof hash1).toBe('string');
        expect(hash1.length).toBe(64); // SHA256 hash length
      });

      it('should generate different hashes for different images', async () => {
        const imageBuffer1 = Buffer.from('test-image-data-1');
        const imageBuffer2 = Buffer.from('test-image-data-2');
        
        const hash1 = await imageService.generateImageHash(imageBuffer1);
        const hash2 = await imageService.generateImageHash(imageBuffer2);
        
        expect(hash1).not.toBe(hash2);
      });
    });
  });

  describe('ResponseHelper', () => {
    describe('success', () => {
      it('should return success response with data', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        
        const data = { test: 'data' };
        ResponseHelper.success(mockRes, data, 'Test success');
        
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Test success',
          data: data
        });
      });

      it('should return success response without data', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        
        ResponseHelper.success(mockRes, null, 'Test success');
        
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Test success'
        });
      });
    });

    describe('error', () => {
      it('should return error response', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        
        ResponseHelper.error(mockRes, 'Test error', 400);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Test error'
        });
      });
    });

    describe('specific response methods', () => {
      it('should return encode success response', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        
        const embedding = [0.1, 0.2, 0.3];
        ResponseHelper.encodeSuccess(mockRes, embedding);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Face encoding successful',
          data: { embedding: embedding }
        });
      });

      it('should return compare success response', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        
        ResponseHelper.compareSuccess(mockRes, true, 0.85);
        
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Face comparison completed',
          data: { isMatch: true, similarity: 0.85 }
        });
      });

      it('should return no face detected response', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        
        ResponseHelper.noFaceDetected(mockRes);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: expect.stringContaining('No face detected')
        });
      });
    });
  });
});
