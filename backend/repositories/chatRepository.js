const db = require('../db');

const getRoom = async (roomId) => {
  const result = await db.query(`
    SELECT provider_id, seeker_id FROM chat_rooms WHERE id = $1
  `, [roomId]);
  return result.rows[0];
};

const createMessage = async (roomId, senderId, message) => {
  const result = await db.query(`
    INSERT INTO chat_messages (room_id, sender_id, message)
    VALUES ($1, $2, $3)
    RETURNING *;
  `, [roomId, senderId, message]);
  return result.rows[0];
};

module.exports = {
  getRoom,
  createMessage,
};
