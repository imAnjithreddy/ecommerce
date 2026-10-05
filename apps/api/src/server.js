const app = require('./app');
const env = require('./config/environment');
const { connectDB, disconnectDB } = require('./config/database');
const { getRedisClient } = require('./config/redis');
const { logger } = require('./core/logger/logger');

async function startServer() {
  try {
    // 1. Initialize MongoDB Connection
    await connectDB();

    // 2. Initialize Redis / Cache Client
    getRedisClient();

    // 3. Start Express HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 DTabs Commerce API running on http://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV} | Platform Domain: ${env.PLATFORM_DOMAIN}`);
    });

    // Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDB();
        logger.info('HTTP server and Database connections closed. Process terminating.');
        process.exit(0);
      });

      // Force exit if shutdown takes too long
      setTimeout(() => {
        logger.error('Shutdown timed out. Forcing process exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
