const { redis } = require('./redis');

/**
 * Redis sliding window rate limiter middleware.
 * @param {Object} options 
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests within the time window
 * @param {string} options.keyPrefix - Prefix for the redis key (e.g. "rl:apply:")
 */
function rateLimiter({ windowMs, max, keyPrefix }) {
  return async (req, res, next) => {
    if (!redis) {
      // If redis is down, we fail open (allow request) so we don't break the app
      console.warn('[RateLimiter] Redis not available, bypassing rate limit');
      return next();
    }

    try {
      const userId = req.internalUserId || req.ip; // Fallback to IP if user not authed yet
      const key = `${keyPrefix}${userId}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      const pipeline = redis.pipeline();
      // Remove old requests from the sorted set
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Count remaining requests
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      // Set expiry on the key to clean up automatically
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      // results[1][1] contains the count from zcard BEFORE we added the new one
      const requestCount = results[1][1];

      if (requestCount >= max) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later.',
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter] Error:', err);
      // Fail open
      next();
    }
  };
}

module.exports = { rateLimiter };
