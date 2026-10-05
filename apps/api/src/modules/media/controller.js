const { storageService } = require('../../config/storage');
const ApiResponse = require('../../core/response/ApiResponse');
const { BadRequestError } = require('../../core/errors/AppError');

class MediaController {
  async uploadSingle(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const { originalname, buffer, mimetype } = req.file;
      const tenantId = req.tenantId || 'global';

      const result = await storageService.uploadFile({
        filename: originalname,
        buffer,
        mimeType: mimetype,
        tenantId
      });

      return ApiResponse.created(res, result, 'Image uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadMultiple(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        throw new BadRequestError('No files uploaded');
      }

      const tenantId = req.tenantId || 'global';
      const results = [];

      for (const file of req.files) {
        const { originalname, buffer, mimetype } = file;
        const result = await storageService.uploadFile({
          filename: originalname,
          buffer,
          mimeType: mimetype,
          tenantId
        });
        results.push(result);
      }

      return ApiResponse.created(res, results, 'Images uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteMedia(req, res, next) {
    try {
      const { key } = req.params;

      if (!key) {
        throw new BadRequestError('File key is required');
      }

      await storageService.deleteFile(key);

      return ApiResponse.success(res, null, 'Image deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MediaController();
