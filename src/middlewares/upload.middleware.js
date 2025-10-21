const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/env.config');
const { ValidationError } = require('../utils/errorHandler');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    // Check file type
    if (!config.upload.allowedImageTypes.includes(file.mimetype.toLowerCase())) {
      const error = new ValidationError(
        `Invalid file type. Allowed types: ${config.upload.allowedImageTypes.join(', ')}`
      );
      return cb(error, false);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    
    if (!allowedExtensions.includes(ext)) {
      const error = new ValidationError(
        `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
      );
      return cb(error, false);
    }

    logger.debug(`File upload validation passed: ${file.originalname}`);
    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', error);
    cb(error, false);
  }
};

// Create multer instance for single file upload
const uploadSingle = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1
  }
});

// Create multer instance for multiple file upload
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Maximum 10 files for batch operations
  }
});

// Middleware for single file upload
const uploadSingleMiddleware = (fieldName = 'image') => {
  return (req, res, next) => {
    uploadSingle.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: `File too large. Maximum size: ${config.upload.maxFileSize / 1024 / 1024}MB`
            });
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: 'Too many files. Maximum 1 file allowed for this endpoint'
            });
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: `Unexpected field name. Expected field: ${fieldName}`
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed'
        });
      }
      
      next();
    });
  };
};

// Middleware for multiple file upload
const uploadMultipleMiddleware = (fieldName = 'images', maxFiles = 10) => {
  return (req, res, next) => {
    uploadMultiple.array(fieldName, maxFiles)(req, res, (err) => {
      if (err) {
        logger.error('Multiple file upload error:', err);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: `File too large. Maximum size: ${config.upload.maxFileSize / 1024 / 1024}MB`
            });
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: `Too many files. Maximum ${maxFiles} files allowed`
            });
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: `Unexpected field name. Expected field: ${fieldName}`
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed'
        });
      }
      
      next();
    });
  };
};

// Middleware to validate uploaded file
const validateUploadedFile = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Additional validation
    const file = req.file;
    
    // Check if file has content
    if (!file.buffer || file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Uploaded file is empty'
      });
    }

    // Check minimum file size (at least 1KB)
    if (file.buffer.length < 1024) {
      return res.status(400).json({
        success: false,
        error: 'File is too small. Minimum size: 1KB'
      });
    }

    logger.debug(`File validation passed: ${file.originalname} (${file.size} bytes)`);
    next();
  } catch (error) {
    logger.error('File validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'File validation failed'
    });
  }
};

// Middleware to validate multiple uploaded files
const validateMultipleUploadedFiles = (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    // Validate each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          error: `File ${i + 1} is empty`
        });
      }

      if (file.buffer.length < 1024) {
        return res.status(400).json({
          success: false,
          error: `File ${i + 1} is too small. Minimum size: 1KB`
        });
      }
    }

    logger.debug(`Multiple files validation passed: ${req.files.length} files`);
    next();
  } catch (error) {
    logger.error('Multiple files validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Files validation failed'
    });
  }
};

module.exports = {
  uploadSingleMiddleware,
  uploadMultipleMiddleware,
  validateUploadedFile,
  validateMultipleUploadedFiles
};
