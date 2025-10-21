const logger = require('./logger');

class ResponseHelper {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message
    };

    if (data !== null) {
      response.data = data;
    }

    logger.info('API Success Response', {
      statusCode,
      message,
      hasData: data !== null
    });

    return res.status(statusCode).json(response);
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, error = null) {
    const response = {
      success: false,
      error: message
    };

    if (error && process.env.NODE_ENV === 'development') {
      response.details = error;
    }

    logger.error('API Error Response', {
      statusCode,
      message,
      error: error?.message || error
    });

    return res.status(statusCode).json(response);
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static badRequest(res, message = 'Bad Request', error = null) {
    return this.error(res, message, 400, error);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static conflict(res, message = 'Conflict') {
    return this.error(res, message, 409);
  }

  static unprocessableEntity(res, message = 'Unprocessable Entity', error = null) {
    return this.error(res, message, 422, error);
  }

  static tooManyRequests(res, message = 'Too Many Requests') {
    return this.error(res, message, 429);
  }

  static internalServerError(res, message = 'Internal Server Error', error = null) {
    return this.error(res, message, 500, error);
  }

  // Specific response methods for face verification endpoints
  static encodeSuccess(res, embedding) {
    return this.success(res, { embedding }, 'Face encoding successful');
  }

  static compareSuccess(res, isMatch, similarity) {
    return this.success(res, { isMatch, similarity }, 'Face comparison completed');
  }

  static noFaceDetected(res) {
    return this.badRequest(res, 'No face detected in the image. Please ensure the image contains a clear, well-lit face.');
  }

  static multipleFacesDetected(res) {
    return this.badRequest(res, 'Multiple faces detected in the image. Please provide an image with only one face.');
  }

  static invalidImageFormat(res) {
    return this.badRequest(res, 'Invalid image format. Please provide a JPEG or PNG image.');
  }

  static imageTooLarge(res) {
    return this.badRequest(res, 'Image file is too large. Please provide an image smaller than 10MB.');
  }

  static invalidEmbeddingFormat(res) {
    return this.badRequest(res, 'Invalid embedding format. Please provide a valid JSON array of numbers.');
  }

  static embeddingNotFound(res) {
    return this.notFound(res, 'No stored embedding found for the provided user.');
  }

  static modelNotLoaded(res) {
    return this.internalServerError(res, 'Face recognition model is not loaded. Please try again later.');
  }

  static imageProcessingFailed(res, error = null) {
    return this.badRequest(res, 'Failed to process the image. Please ensure the image is valid and try again.', error);
  }
}

module.exports = ResponseHelper;
