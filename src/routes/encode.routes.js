const express = require('express');
const router = express.Router();
const encodeController = require('../controllers/encode.controller');
const uploadMiddleware = require('../middlewares/upload.middleware');

// POST /encode - Encode face and store embedding
router.post('/',
  uploadMiddleware.uploadSingleMiddleware('image'),
  uploadMiddleware.validateUploadedFile,
  encodeController.encodeFace
);

// GET /encode - List all user embeddings
router.get('/',
  encodeController.listUserEmbeddings
);

// GET /encode/:userId - Get specific user embedding
router.get('/:userId',
  encodeController.getUserEmbedding
);

// DELETE /encode/:userId - Delete user embedding
router.delete('/:userId',
  encodeController.deleteUserEmbedding
);

module.exports = router;
