const Redis = require('ioredis');
const env = require('./environment');
const { logger } = require('../core/logger/logger');

let redisClient = null;
let isRedisMock = false;

// Resilient In-Memory Fallback Client if Redis server is unavailable
class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    this._checkTtl(key);
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (mode === 'EX' && duration) {
      this.ttls.set(key, Date.now() + duration * 1000);
    } else if (mode === 'PX' && duration) {
      this.ttls.set(key, Date.now() + duration);
    }
    return 'OK';
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        this.ttls.delete(key);
        count++;
      }
    }
    return count;
  }

  async incr(key) {
    this._checkTtl(key);
    let val = parseInt(this.store.get(key) || '0', 10);
    val += 1;
    this.store.set(key, val.toString());
    return val;
  }

  async expire(key, seconds) {
    if (this.store.has(key)) {
      this.ttls.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async flushall() {
    this.store.clear();
    this.ttls.clear();
    return 'OK';
  }

  _checkTtl(key) {
    if (this.ttls.has(key)) {
      if (Date.now() > this.ttls.get(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
      }
    }
  }

  on() { return this; }
  quit() { return Promise.resolve(); }
}

function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (env.IS_TEST) {
    logger.info('Using in-memory cache for test environment');
    redisClient = new InMemoryCache();
    isRedisMock = true;
    return redisClient;
  }

  try {
    const isTls = env.REDIS_URL.startsWith('rediss://');
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 10000,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      retryStrategy(times) {
        if (times > 2) {
          return null; // Stop retrying and fallback
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true
    });

    client.on('error', (err) => {
      if (!isRedisMock) {
        logger.warn(`Redis connection error (${err.message}). Activating in-memory fallback.`);
        redisClient = new InMemoryCache();
        isRedisMock = true;
      }
    });

    // Attempt connection
    client.connect().then(() => {
      logger.info('Connected to Redis successfully');
    }).catch((err) => {
      logger.warn(`Redis not available (${err.message}). Using resilient in-memory cache.`);
      redisClient = new InMemoryCache();
      isRedisMock = true;
    });

    redisClient = client;
    return redisClient;
  } catch (error) {
    logger.warn('Failed to initialize Redis client. Using resilient in-memory cache.', { error: error.message });
    redisClient = new InMemoryCache();
    isRedisMock = true;
    return redisClient;
  }
}

module.exports = {
  getRedisClient,
  isMockRedis: () => isRedisMock
};
