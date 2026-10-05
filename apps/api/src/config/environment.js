const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env in root or local directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  PLATFORM_DOMAIN: process.env.PLATFORM_DOMAIN || 'dtabs.tech',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',

  // Database & Cache
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dtabs_commerce',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'dtabs_dev_jwt_secret_key_minimum_32_characters_long',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dtabs_dev_jwt_refresh_secret_key_minimum_32_chars',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dtabs_dev_cookie_secret',
  WEBHOOK_SIGNING_SECRET: process.env.WEBHOOK_SIGNING_SECRET || 'whsec_dtabs_sample_secret',

  // Storage
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
  STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH || './uploads',

  // Payments
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
  DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY || 'dodo_api_key_placeholder',
  DODO_PAYMENTS_WEBHOOK_SECRET: process.env.DODO_PAYMENTS_WEBHOOK_SECRET || 'dodo_whsec_placeholder',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test'
};

module.exports = env;
