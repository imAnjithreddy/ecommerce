const fs = require('fs');
const path = require('path');
const env = require('./environment');
const { logger } = require('../core/logger/logger');

class StorageService {
  constructor() {
    this.driver = env.STORAGE_DRIVER;
    this.localUploadPath = path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH);

    if (this.driver === 'local') {
      if (!fs.existsSync(this.localUploadPath)) {
        fs.mkdirSync(this.localUploadPath, { recursive: true });
      }
    }
  }

  async uploadFile({ filename, buffer, mimeType, tenantId }) {
    if (this.driver === 'local') {
      const tenantDir = path.join(this.localUploadPath, tenantId || 'general');
      if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
      }
      const uniqueName = `${Date.now()}-${filename}`;
      const filePath = path.join(tenantDir, uniqueName);
      await fs.promises.writeFile(filePath, buffer);

      const fileUrl = `${env.API_BASE_URL}/uploads/${tenantId || 'general'}/${uniqueName}`;
      logger.info('File saved locally', { filename: uniqueName, tenantId, url: fileUrl });
      return {
        url: fileUrl,
        key: `${tenantId || 'general'}/${uniqueName}`,
        mimeType
      };
    }

    // Extensible for AWS S3 / Cloudflare R2
    logger.info('Using S3 driver mock upload', { filename, tenantId });
    return {
      url: `https://storage.dtabs.tech/${tenantId || 'general'}/${filename}`,
      key: `${tenantId || 'general'}/${filename}`,
      mimeType
    };
  }

  async deleteFile(key) {
    if (this.driver === 'local') {
      const filePath = path.join(this.localUploadPath, key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
    return true;
  }
}

const storageService = new StorageService();

module.exports = {
  storageService
};
