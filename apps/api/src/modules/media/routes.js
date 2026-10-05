const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storageService } = require('../../config/storage');
const ApiResponse = require('../../core/response/ApiResponse');
const { BadRequestError } = require('../../core/errors/AppError');
const mediaController = require('./controller');

const upload = multer({ storage: multer.memoryStorage() });

// Direct JSON base64 or URL media registration (Legacy support)
router.post('/upload', async (req, res, next) => {
  try {
    const { filename = 'image.jpg', data, mimeType = 'image/jpeg' } = req.body;

    if (!data) {
      throw new BadRequestError('Data (base64 string or file payload) is required');
    }

    const buffer = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const result = await storageService.uploadFile({
      filename,
      buffer,
      mimeType,
      tenantId: req.tenantId || 'global'
    });

    return ApiResponse.created(res, result, 'Image uploaded successfully');
  } catch (error) {
    next(error);
  }
});

// Multipart file uploads
router.post('/upload-single', upload.single('file'), mediaController.uploadSingle);
router.post('/upload-multiple', upload.array('files'), mediaController.uploadMultiple);
router.delete('/:key(*)', mediaController.deleteMedia);

module.exports = router;
