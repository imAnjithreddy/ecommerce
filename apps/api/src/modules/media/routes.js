const express = require('express');
const router = express.Router();
const { storageService } = require('../../config/storage');
const ApiResponse = require('../../core/response/ApiResponse');
const { BadRequestError } = require('../../core/errors/AppError');

// Direct JSON base64 or URL media registration
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

module.exports = router;
