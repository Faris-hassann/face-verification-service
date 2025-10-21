const express = require('express');
const router = express.Router();
const compareController = require('../controllers/compare.controller');
const uploadMiddleware = require('../middlewares/upload.middleware');

// POST /compare - Compare face against provided embedding
router.post('/',
  uploadMiddleware.uploadSingleMiddleware('image'),
  uploadMiddleware.validateUploadedFile,
  compareController.compareFace
);

// POST /compare/:userId - Compare face against stored user embedding
router.post('/:userId',
  uploadMiddleware.uploadSingleMiddleware('image'),
  uploadMiddleware.validateUploadedFile,
  compareController.compareFaceByUserId
);

// POST /compare/batch - Batch compare multiple faces
router.post('/batch',
  uploadMiddleware.uploadMultipleMiddleware('images', 10),
  uploadMiddleware.validateMultipleUploadedFiles,
  compareController.batchCompareFaces
);

module.exports = router;
