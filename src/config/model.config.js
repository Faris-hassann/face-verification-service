const { InferenceSession } = require('onnxruntime-node');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('./env.config');

class ModelConfig {
  constructor() {
    this.session = null;
    this.isLoaded = false;
  }

  async loadModel() {
    try {
      const modelPath = path.resolve(config.model.path);
      
      // Check if model file exists
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Model file not found at ${modelPath}. Please download the model from Hugging Face.`);
      }

      logger.info(`Loading ONNX model from ${modelPath}`);
      
      // Load the ONNX model
      this.session = await InferenceSession.create(modelPath, {
        executionProviders: ['cpu'], // Use CPU execution provider
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      });

      this.isLoaded = true;
      logger.info('ONNX model loaded successfully');
      
      // Log model input/output information
      const inputNames = this.session.inputNames;
      const outputNames = this.session.outputNames;
      
      logger.info(`Model input names: ${inputNames.join(', ')}`);
      logger.info(`Model output names: ${outputNames.join(', ')}`);
      
      return this.session;
    } catch (error) {
      logger.error('Failed to load ONNX model:', error);
      throw error;
    }
  }

  async runInference(inputData) {
    try {
      if (!this.isLoaded || !this.session) {
        throw new Error('Model not loaded. Call loadModel() first.');
      }

      // Prepare input tensor
      const inputTensor = new Float32Array(inputData);
      const inputShape = [1, 3, config.model.inputSize, config.model.inputSize];
      
      // Create input feeds
      const feeds = {};
      const inputName = this.session.inputNames[0];
      feeds[inputName] = new Float32Array(inputTensor);

      // Run inference
      const results = await this.session.run(feeds);
      
      // Extract embedding from results
      const outputName = this.session.outputNames[0];
      const embedding = Array.from(results[outputName].data);
      
      logger.debug(`Generated embedding with dimension: ${embedding.length}`);
      
      return embedding;
    } catch (error) {
      logger.error('Model inference failed:', error);
      throw error;
    }
  }

  isModelLoaded() {
    return this.isLoaded;
  }

  getModelInfo() {
    if (!this.session) {
      return null;
    }

    return {
      inputNames: this.session.inputNames,
      outputNames: this.session.outputNames,
      inputSize: config.model.inputSize,
      embeddingDimension: config.model.embeddingDimension,
    };
  }

  async dispose() {
    try {
      if (this.session) {
        await this.session.release();
        this.session = null;
        this.isLoaded = false;
        logger.info('Model session disposed');
      }
    } catch (error) {
      logger.error('Error disposing model session:', error);
      throw error;
    }
  }
}

module.exports = new ModelConfig();
