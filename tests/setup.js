// Test setup file
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'face_verification_test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Increase timeout for async operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper to create mock image buffer
  createMockImageBuffer: (size = 1024) => {
    return Buffer.alloc(size, 'mock-image-data');
  },
  
  // Helper to create mock embedding
  createMockEmbedding: (dimension = 512) => {
    return new Array(dimension).fill(0.1);
  },
  
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Suppress console logs during tests unless explicitly enabled
if (!process.env.ENABLE_TEST_LOGS) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
}
