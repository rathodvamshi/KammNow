const Redis = require('ioredis');

/**
 * Singleton Redis client for the backend.
 * Expects REDIS_URL in .env, falls back to localhost.
 */
let redis = null;

try {
  // Use a fallback to localhost for development if URL is missing
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('✅ Connected to Redis successfully');
  });

} catch (err) {
  console.error('Failed to initialize Redis:', err.message);
}

const GEO_KEY = 'geo:seekers';
const GEO_TTL = 86400; // 24 hours (cleanup old entries automatically)

/**
 * Adds a user to the Redis geo-index.
 * @param {string} userId - The user's UUID
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 */
async function addSeekerLocation(userId, lon, lat) {
  if (!redis) return;
  try {
    // GEORADD key lon lat member
    await redis.geoadd(GEO_KEY, lon, lat, userId);
    // Refresh TTL on the whole key
    await redis.expire(GEO_KEY, GEO_TTL);
  } catch (err) {
    console.error('Redis geoadd error:', err.message);
  }
}

/**
 * Finds users within a radius.
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Promise<Array<{member: string, distance: number}>>}
 */
async function getSeekersNearby(lon, lat, radiusKm = 10) {
  if (!redis) return [];
  try {
    // GEORADIUS key lon lat radius km WITHDIST ASC
    // Returns array of arrays: [ ["userId1", "2.3"], ["userId2", "5.1"] ]
    const results = await redis.georadius(
      GEO_KEY,
      lon,
      lat,
      radiusKm,
      'km',
      'WITHDIST',
      'ASC',
      'COUNT',
      500
    );

    return results.map(res => ({
      userId: res[0],
      distanceKm: parseFloat(res[1])
    }));
  } catch (err) {
    console.error('Redis georadius error:', err.message);
    return [];
  }
}

module.exports = {
  redis,
  addSeekerLocation,
  getSeekersNearby
};
