const request = require('supertest');
const App = require('../src/app');
const dbConfig = require('../src/config/db.config');
const faceService = require('../src/services/face.service');
const similarityService = require('../src/services/similarity.service');

describe('Compare Endpoint Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'face_verification_test';
    
    app = new App();
    server = app.getApp();
    
    // Initialize database for testing
    await dbConfig.connect();
    await dbConfig.sync(true); // Force sync for testing
  });

  afterAll(async () => {
    await dbConfig.close();
  });

  beforeEach(() => {
    // Mock face service for testing
    jest.spyOn(faceService, 'isModelLoaded').mockReturnValue(true);
    jest.spyOn(faceService, 'processImageAndGenerateEmbedding').mockResolvedValue({
      embedding: new Array(512).fill(0.1),
      faceRegion: { x: 10, y: 10, width: 100, height: 100 },
      processedImage: null
    });

    // Mock similarity service
    jest.spyOn(similarityService, 'parseEmbeddingString').mockReturnValue(new Array(512).fill(0.1));
    jest.spyOn(similarityService, 'compareEmbeddings').mockReturnValue({
      isMatch: true,
      similarity: 0.85,
      threshold: 0.6,
      confidence: 0.9
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/compare', () => {
    it('should compare faces successfully', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      const testEmbedding = JSON.stringify(new Array(512).fill(0.1));

      const response = await request(server)
        .post('/api/compare')
        .attach('image', testImageBuffer, 'test.jpg')
        .field('storedEmbedding', testEmbedding)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isMatch).toBeDefined();
      expect(typeof response.body.data.isMatch).toBe('boolean');
      expect(response.body.data.similarity).toBeDefined();
      expect(typeof response.body.data.similarity).toBe('number');
    });

    it('should return error when no image is provided', async () => {
      const response = await request(server)
        .post('/api/compare')
        .field('storedEmbedding', JSON.stringify(new Array(512).fill(0.1)))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });

    it('should return error when no stored embedding is provided', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(server)
        .post('/api/compare')
        .attach('image', testImageBuffer, 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Stored embedding is required');
    });

    it('should return error for invalid embedding format', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      jest.spyOn(similarityService, 'parseEmbeddingString').mockImplementation(() => {
        throw new Error('Invalid embedding format');
      });

      const response = await request(server)
        .post('/api/compare')
        .attach('image', testImageBuffer, 'test.jpg')
        .field('storedEmbedding', 'invalid-json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid embedding format');
    });

    it('should handle face detection errors', async () => {
      jest.spyOn(faceService, 'processImageAndGenerateEmbedding').mockRejectedValue(
        new Error('No face detected in the image')
      );

      const testImageBuffer = Buffer.from('fake-image-data');
      const testEmbedding = JSON.stringify(new Array(512).fill(0.1));

      const response = await request(server)
        .post('/api/compare')
        .attach('image', testImageBuffer, 'test.jpg')
        .field('storedEmbedding', testEmbedding)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No face detected');
    });

    it('should use custom threshold when provided', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      const testEmbedding = JSON.stringify(new Array(512).fill(0.1));

      const response = await request(server)
        .post('/api/compare')
        .attach('image', testImageBuffer, 'test.jpg')
        .field('storedEmbedding', testEmbedding)
        .field('threshold', '0.8')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(similarityService.compareEmbeddings).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        0.8
      );
    });
  });

  describe('POST /api/compare/:userId', () => {
    it('should compare face against stored user embedding', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(server)
        .post('/api/compare/test-user')
        .attach('image', testImageBuffer, 'test.jpg')
        .expect(404); // User doesn't exist in test database

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No stored embedding found');
    });

    it('should return error when no image is provided', async () => {
      const response = await request(server)
        .post('/api/compare/test-user')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });
  });

  describe('POST /api/compare/batch', () => {
    it('should handle batch comparison', async () => {
      const testImageBuffer1 = Buffer.from('fake-image-data-1');
      const testImageBuffer2 = Buffer.from('fake-image-data-2');
      const testEmbeddings = JSON.stringify([
        new Array(512).fill(0.1),
        new Array(512).fill(0.2)
      ]);

      const response = await request(server)
        .post('/api/compare/batch')
        .attach('images', testImageBuffer1, 'test1.jpg')
        .attach('images', testImageBuffer2, 'test2.jpg')
        .field('storedEmbeddings', testEmbeddings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
      expect(Array.isArray(response.body.data.results)).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });

    it('should return error when no images are provided', async () => {
      const response = await request(server)
        .post('/api/compare/batch')
        .field('storedEmbeddings', JSON.stringify([new Array(512).fill(0.1)]))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No files uploaded');
    });

    it('should return error when no stored embeddings are provided', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(server)
        .post('/api/compare/batch')
        .attach('images', testImageBuffer, 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Stored embeddings are required');
    });
  });
});
