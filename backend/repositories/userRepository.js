const db = require('../db');

/**
 * Creates or updates a user profile.
 * Matches the actual `users` table schema in Supabase/Postgres.
 * Column name is `phone` (not `phone_number`).
 * All fields sent by the frontend (age, skills, is_profile_complete, etc.) are persisted.
 */
const upsertProfile = async (firebaseUid, profileData) => {
  const result = await db.query(`
    INSERT INTO users (
      firebase_uid,
      phone,
      name,
      role,
      bio,
      gender,
      languages,
      skills,
      experience,
      is_profile_complete,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (firebase_uid)
    DO UPDATE SET
      phone             = COALESCE(EXCLUDED.phone,             users.phone),
      name              = COALESCE(EXCLUDED.name,              users.name),
      role              = COALESCE(EXCLUDED.role,              users.role),
      bio               = COALESCE(EXCLUDED.bio,               users.bio),
      gender            = COALESCE(EXCLUDED.gender,            users.gender),
      languages         = COALESCE(EXCLUDED.languages,         users.languages),
      skills            = COALESCE(EXCLUDED.skills,            users.skills),
      experience        = COALESCE(EXCLUDED.experience,        users.experience),
      is_profile_complete = COALESCE(EXCLUDED.is_profile_complete, users.is_profile_complete),
      updated_at        = NOW()
    RETURNING *;
  `, [
    firebaseUid,
    profileData.phone || null,
    profileData.name || null,
    profileData.role || 'seeker',
    profileData.bio || null,
    profileData.gender || null,
    profileData.languages ? JSON.stringify(profileData.languages) : null,
    profileData.skills ? JSON.stringify(profileData.skills) : null,
    profileData.experience ?? null,
    profileData.is_profile_complete ?? false,
  ]);
  return result.rows[0];
};

const updateLocation = async (userId, lat, lon) => {
  const result = await db.query(`
    UPDATE users
    SET
      location_lat  = $1,
      location_lng  = $2,
      updated_at    = NOW()
    WHERE id = $3
    RETURNING id, location_lat, location_lng;
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
    UPDATE users SET updated_at = NOW() WHERE id = $1
  `, [userId]);
};

module.exports = {
  upsertProfile,
  updateLocation,
  getAddresses,
  updateHeartbeat,
};
