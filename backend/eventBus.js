const { redis } = require('./redis');

/**
 * Simple Event Bus using Redis Streams.
 * This abstraction allows us to swap out Redis for Kafka later without changing business logic.
 */

/**
 * Publishes an event to a stream.
 * @param {string} stream - Name of the stream (e.g., 'job:events')
 * @param {string} eventType - Type of event (e.g., 'job.posted')
 * @param {object} payload - Data payload (will be serialized to JSON)
 */
async function publishEvent(stream, eventType, payload) {
  if (!redis) {
    console.warn(`[EventBus] Redis not available, dropping event ${eventType}`);
    return;
  }
  
  try {
    const payloadStr = JSON.stringify(payload);
    
    // XADD stream * type <eventType> payload <json>
    // Max length 10,000 to prevent unbounded growth
    await redis.xadd(
      stream,
      'MAXLEN', '~', 10000,
      '*',
      'type', eventType,
      'payload', payloadStr
    );
    
    console.log(`[EventBus] Published ${eventType} to ${stream}`);
  } catch (err) {
    console.error(`[EventBus] Publish error for ${eventType}:`, err.message);
  }
}

module.exports = {
  publishEvent
};
