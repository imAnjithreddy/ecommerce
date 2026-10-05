const { getRedisClient } = require('../config/redis');
const { RateLimitExceededError } = require('../core/errors/AppError');

/**
 * Sliding window / fixed counter rate limiter using Redis / in-memory cache
 * @param {Object} options - { windowSeconds, maxRequests, keyPrefix }
 */
function rateLimiter({ windowSeconds = 60, maxRequests = 100, keyPrefix = 'rl' } = {}) {
  return async (req, res, next) => {
    try {
      const redis = getRedisClient();
      const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const key = `${keyPrefix}:${ip}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        throw new RateLimitExceededError();
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return next(error);
      }
      // If rate limiter fails, fail open in development/graceful degradation
      next();
    }
  };
}

module.exports = {
  rateLimiter
};
