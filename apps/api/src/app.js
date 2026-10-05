const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const mongoose = require('mongoose');

const env = require('./config/environment');
const { logger } = require('./core/logger/logger');
const { httpLogger } = require('./core/logger/httpLogger');
const { errorHandler } = require('./middleware/error.middleware');
const { NotFoundError } = require('./core/errors/AppError');
const { isMockRedis } = require('./config/redis');

// Routers
const authRoutes = require('./modules/auth/routes');
const tenantRoutes = require('./modules/tenants/routes');
const storefrontRoutes = require('./modules/storefront/routes');
const orderRoutes = require('./modules/orders/routes');
const adminRoutes = require('./modules/admin/routes');
const platformRoutes = require('./modules/platform/routes');
const paymentRoutes = require('./modules/payments/routes');
const mediaRoutes = require('./modules/media/routes');

const app = express();

// Trust proxy for reverse proxy / domain resolver
app.set('trust proxy', true);

// Core Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: (origin, callback) => {
    // In development or local wildcard subdomains, allow requests
    callback(null, true);
  },
  credentials: true
}));

app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Pino-HTTP request logger
app.use(httpLogger);

// Static media files for local storage
app.use('/uploads', express.static(path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH)));

// System Health Check
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      cache: isMockRedis() ? 'in-memory-fallback' : 'redis-connected'
    },
    version: '1.0.0'
  });
});

// Mount Versioned API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/storefront', storefrontRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/coupons', require('./modules/coupons/routes').adminRouter); // mount admin coupon routes
app.use('/api/v1/platform', platformRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/coupons', require('./modules/coupons/routes'));

// Catch 404
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
