const chatRepository = require('../repositories/chatRepository');
const { redis } = require('../redis'); // Keep Redis here for service level logic

const createMessage = async (roomId, senderId, messageText) => {
  // 1. Rate Limiting via Redis (1 message per second per user)
  if (redis) {
    const rateLimitKey = `rate_limit:chat:${senderId}`;
    const isAllowed = await redis.set(rateLimitKey, '1', 'NX', 'EX', 1);
    if (!isAllowed) {
      throw new Error('RATE_LIMIT');
    }
  }

  // 2. Validate Room Access
  const room = await chatRepository.getRoom(roomId);
  if (!room) {
    throw new Error('NOT_FOUND');
  }

  if (room.provider_id !== senderId && room.seeker_id !== senderId) {
    throw new Error('FORBIDDEN');
  }

  // 3. Insert Message
  return await chatRepository.createMessage(roomId, senderId, messageText);
};

module.exports = {
  createMessage,
};
