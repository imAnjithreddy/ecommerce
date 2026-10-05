const mongoose = require('mongoose');
const env = require('./environment');
const { logger } = require('../core/logger/logger');

let memoryMongoServer = null;

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    // Try connecting to configured MongoDB
    mongoose.set('strictQuery', true);
    
    // Short timeout in dev/test so we don't block if local mongod is absent
    const connectPromise = mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });

    await connectPromise;
    const maskedUri = env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    logger.info('Connected to MongoDB database successfully', { uri: maskedUri });
    return mongoose.connection;
  } catch (error) {
    logger.warn(`Local/Configured MongoDB connection failed: ${error.message}`);

    // If in development or test, spin up in-memory MongoDB so developer experiences zero friction
    if (!env.IS_PRODUCTION) {
      logger.info('Spinning up embedded in-memory MongoDB instance for local execution...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryMongoServer = await MongoMemoryServer.create();
        const memUri = memoryMongoServer.getUri();
        await mongoose.connect(memUri);
        logger.info('Connected to In-Memory MongoDB successfully', { uri: memUri });
        return mongoose.connection;
      } catch (memErr) {
        logger.error('Failed to initialize in-memory MongoDB instance', { error: memErr.message });
        throw memErr;
      }
    } else {
      logger.error('Production MongoDB connection failed', { error: error.message });
      throw error;
    }
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryMongoServer) {
    await memoryMongoServer.stop();
  }
  logger.info('Disconnected from MongoDB');
}

module.exports = {
  connectDB,
  disconnectDB
};
