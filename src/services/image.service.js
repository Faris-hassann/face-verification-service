const Jimp = require('jimp');
const sharp = require('sharp');
const logger = require('../utils/logger');
const config = require('../config/env.config');
const { ImageProcessingError } = require('../utils/errorHandler');

class ImageService {
  constructor() {
    this.supportedFormats = ['jpeg', 'jpg', 'png'];
    this.maxFileSize = config.upload.maxFileSize;
    this.targetSize = config.model.inputSize;
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {boolean}
   */
  validateImageFile(file) {
    if (!file) {
      throw new ImageProcessingError('No image file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new ImageProcessingError(`Image file is too large. Maximum size allowed: ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const mimeType = file.mimetype.toLowerCase();
    if (!config.upload.allowedImageTypes.includes(mimeType)) {
      throw new ImageProcessingError('Invalid image format. Only JPEG and PNG images are supported.');
    }

    return true;
  }

  /**
   * Load and validate image using Jimp
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Jimp>}
   */
  async loadImage(imageBuffer) {
    try {
      const image = await Jimp.read(imageBuffer);
      
      // Check image dimensions
      if (image.getWidth() < 50 || image.getHeight() < 50) {
        throw new ImageProcessingError('Image is too small. Minimum size: 50x50 pixels');
      }

      logger.debug(`Loaded image: ${image.getWidth()}x${image.getHeight()}`);
      return image;
    } catch (error) {
      logger.error('Failed to load image:', error);
      throw new ImageProcessingError('Failed to load image. Please ensure the file is a valid image.');
    }
  }

  /**
   * Detect faces using simple edge detection and region analysis
   * This is a simplified face detection - in production, you'd use a proper face detection model
   * @param {Jimp} image - Jimp image object
   * @returns {Array} Array of face regions
   */
  async detectFaces(image) {
    try {
      // Convert to grayscale for analysis
      const grayImage = image.clone().grayscale();
      const width = grayImage.getWidth();
      const height = grayImage.getHeight();

      // Simple face detection based on skin tone and symmetry
      // This is a basic implementation - in production, use a proper face detection model
      const faces = [];
      const minFaceSize = Math.min(width, height) * 0.1; // Minimum 10% of image size
      const maxFaceSize = Math.min(width, height) * 0.8; // Maximum 80% of image size

      // Scan for potential face regions
      for (let y = 0; y < height - minFaceSize; y += 20) {
        for (let x = 0; x < width - minFaceSize; x += 20) {
          const regionSize = Math.min(minFaceSize, Math.min(width - x, height - y));
          
          if (this.isPotentialFaceRegion(grayImage, x, y, regionSize)) {
            faces.push({
              x: Math.max(0, x - 10),
              y: Math.max(0, y - 10),
              width: Math.min(width - x + 10, regionSize + 20),
              height: Math.min(height - y + 10, regionSize + 20),
              confidence: 0.8 // Simplified confidence score
            });
          }
        }
      }

      // Remove overlapping faces (keep the one with higher confidence)
      const filteredFaces = this.filterOverlappingFaces(faces);

      logger.debug(`Detected ${filteredFaces.length} face(s)`);
      return filteredFaces;
    } catch (error) {
      logger.error('Face detection failed:', error);
      throw new ImageProcessingError('Failed to detect faces in the image');
    }
  }

  /**
   * Check if a region might contain a face (simplified detection)
   * @param {Jimp} image - Grayscale image
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} size - Region size
   * @returns {boolean}
   */
  isPotentialFaceRegion(image, x, y, size) {
    const sampleSize = Math.min(size, 50);
    let skinTonePixels = 0;
    let totalPixels = 0;

    for (let dy = 0; dy < sampleSize; dy += 5) {
      for (let dx = 0; dx < sampleSize; dx += 5) {
        const pixel = image.getPixelColor(x + dx, y + dy);
        const { r, g, b } = Jimp.intToRGBA(pixel);
        
        // Simple skin tone detection (simplified)
        if (r > 95 && g > 40 && b > 20 && 
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 && r > g && r > b) {
          skinTonePixels++;
        }
        totalPixels++;
      }
    }

    return (skinTonePixels / totalPixels) > 0.3;
  }

  /**
   * Filter overlapping face detections
   * @param {Array} faces - Array of face detections
   * @returns {Array} Filtered faces
   */
  filterOverlappingFaces(faces) {
    if (faces.length <= 1) return faces;

    const filtered = [];
    const used = new Set();

    for (let i = 0; i < faces.length; i++) {
      if (used.has(i)) continue;

      let bestFace = faces[i];
      let bestIndex = i;

      for (let j = i + 1; j < faces.length; j++) {
        if (used.has(j)) continue;

        const overlap = this.calculateOverlap(faces[i], faces[j]);
        if (overlap > 0.3) { // 30% overlap threshold
          if (faces[j].confidence > bestFace.confidence) {
            bestFace = faces[j];
            bestIndex = j;
          }
          used.add(j);
        }
      }

      filtered.push(bestFace);
      used.add(bestIndex);
    }

    return filtered;
  }

  /**
   * Calculate overlap between two face regions
   * @param {Object} face1 - First face region
   * @param {Object} face2 - Second face region
   * @returns {number} Overlap ratio
   */
  calculateOverlap(face1, face2) {
    const x1 = Math.max(face1.x, face2.x);
    const y1 = Math.max(face1.y, face2.y);
    const x2 = Math.min(face1.x + face1.width, face2.x + face2.width);
    const y2 = Math.min(face1.y + face1.height, face2.y + face2.height);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersectionArea = (x2 - x1) * (y2 - y1);
    const unionArea = face1.width * face1.height + face2.width * face2.height - intersectionArea;

    return intersectionArea / unionArea;
  }

  /**
   * Crop and resize face region
   * @param {Jimp} image - Original image
   * @param {Object} face - Face region
   * @returns {Promise<Jimp>} Processed face image
   */
  async cropAndResizeFace(image, face) {
    try {
      // Crop the face region
      const croppedImage = image.clone().crop(
        face.x,
        face.y,
        face.width,
        face.height
      );

      // Resize to target size
      const resizedImage = croppedImage.resize(this.targetSize, this.targetSize);

      logger.debug(`Cropped and resized face to ${this.targetSize}x${this.targetSize}`);
      return resizedImage;
    } catch (error) {
      logger.error('Failed to crop and resize face:', error);
      throw new ImageProcessingError('Failed to process face region');
    }
  }

  /**
   * Normalize image for model input
   * @param {Jimp} image - Image to normalize
   * @returns {Promise<Float32Array>} Normalized pixel data
   */
  async normalizeImage(image) {
    try {
      const width = image.getWidth();
      const height = image.getHeight();
      const pixelData = new Float32Array(width * height * 3);

      // Convert image to RGB and normalize to [0, 1]
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = image.getPixelColor(x, y);
          const { r, g, b } = Jimp.intToRGBA(pixel);
          
          const index = (y * width + x) * 3;
          pixelData[index] = r / 255.0;     // Red channel
          pixelData[index + 1] = g / 255.0; // Green channel
          pixelData[index + 2] = b / 255.0;  // Blue channel
        }
      }

      logger.debug(`Normalized image data: ${pixelData.length} values`);
      return pixelData;
    } catch (error) {
      logger.error('Failed to normalize image:', error);
      throw new ImageProcessingError('Failed to normalize image data');
    }
  }

  /**
   * Process image for face verification
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Object>} Processed face data
   */
  async processImageForVerification(imageBuffer) {
    try {
      // Validate image file
      this.validateImageFile({ 
        size: imageBuffer.length, 
        mimetype: 'image/jpeg' // Assume JPEG for buffer validation
      });

      // Load image
      const image = await this.loadImage(imageBuffer);

      // Detect faces
      const faces = await this.detectFaces(image);

      if (faces.length === 0) {
        throw new ImageProcessingError('No face detected in the image');
      }

      if (faces.length > 1) {
        throw new ImageProcessingError('Multiple faces detected. Please provide an image with only one face');
      }

      // Process the detected face
      const face = faces[0];
      const croppedFace = await this.cropAndResizeFace(image, face);
      const normalizedData = await this.normalizeImage(croppedFace);

      return {
        faceRegion: face,
        processedImage: croppedFace,
        normalizedData: normalizedData
      };
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate image hash for verification
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<string>} Image hash
   */
  async generateImageHash(imageBuffer) {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(imageBuffer).digest('hex');
    } catch (error) {
      logger.error('Failed to generate image hash:', error);
      return null;
    }
  }
}

module.exports = new ImageService();
