const request = require('supertest');
const path = require('path');
const fs = require('fs');
const App = require('../src/app');
const dbConfig = require('../src/config/db.config');
const faceService = require('../src/services/face.service');

describe('Encode Endpoint Tests', () => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/encode', () => {
    it('should encode a face successfully', async () => {
      // Create a test image buffer (simulate a small image)
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(server)
        .post('/api/encode')
        .attach('image', testImageBuffer, 'test.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embedding).toBeDefined();
      expect(Array.isArray(response.body.data.embedding)).toBe(true);
      expect(response.body.data.embedding.length).toBe(512);
    });

    it('should return error when no image is provided', async () => {
      const response = await request(server)
        .post('/api/encode')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });

    it('should return error when model is not loaded', async () => {
      jest.spyOn(faceService, 'isModelLoaded').mockReturnValue(false);

      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(server)
        .post('/api/encode')
        .attach('image', testImageBuffer, 'test.jpg')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('model is not loaded');
    });

    it('should handle face detection errors', async () => {
      jest.spyOn(faceService, 'processImageAndGenerateEmbedding').mockRejectedValue(
        new Error('No face detected in the image')
      );

      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(server)
        .post('/api/encode')
        .attach('image', testImageBuffer, 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No face detected');
    });
  });

  describe('GET /api/encode', () => {
    it('should list all user embeddings', async () => {
      const response = await request(server)
        .get('/api/encode')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBeDefined();
      expect(Array.isArray(response.body.data.embeddings)).toBe(true);
    });
  });

  describe('GET /api/encode/:userId', () => {
    it('should return 404 for non-existent user', async () => {
      const response = await request(server)
        .get('/api/encode/non-existent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No stored embedding found');
    });
  });

  describe('DELETE /api/encode/:userId', () => {
    it('should return 404 for non-existent user', async () => {
      const response = await request(server)
        .delete('/api/encode/non-existent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No stored embedding found');
    });
  });
});
