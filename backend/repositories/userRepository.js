const db = require('../db');

const upsertProfile = async (firebaseUid, profileData) => {
  const result = await db.query(`
    INSERT INTO users (
      firebase_uid, phone_number, name, email,
      role, profile_image, notification_preferences,
      device_token
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (firebase_uid)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, users.name),
      email = COALESCE(EXCLUDED.email, users.email),
      role = COALESCE(EXCLUDED.role, users.role),
      profile_image = COALESCE(EXCLUDED.profile_image, users.profile_image),
      notification_preferences = COALESCE(EXCLUDED.notification_preferences, users.notification_preferences),
      device_token = COALESCE(EXCLUDED.device_token, users.device_token),
      updated_at = NOW()
    RETURNING *;
  `, [
    firebaseUid,
    profileData.phone_number,
    profileData.name || '',
    profileData.email || '',
    profileData.role || 'seeker',
    profileData.profile_image || '',
    profileData.notification_preferences || { push: true, sms: false },
    profileData.device_token || null
  ]);
  return result.rows[0];
};

const updateLocation = async (userId, lat, lon) => {
  const result = await db.query(`
    UPDATE users
    SET 
      last_location_lat = $1, 
      last_location_lng = $2,
      last_active = NOW()
    WHERE id = $3
    RETURNING id, last_location_lat, last_location_lng;
  `, [lat, lon, userId]);
  return result.rows[0];
};

const getAddresses = async (userId) => {
  const result = await db.query(`
    SELECT * FROM saved_addresses
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at DESC
  `, [userId]);
  return result.rows;
};

const updateHeartbeat = async (userId) => {
  await db.query(`
    UPDATE users SET last_active = NOW() WHERE id = $1
  `, [userId]);
};

module.exports = {
  upsertProfile,
  updateLocation,
  getAddresses,
  updateHeartbeat,
};
