require('dotenv').config({ path: '../.env' });
const db = require('./db');
const { redis } = require('./redis');

async function testFeed() {
  try {
    const lat = 17.4344;
    const lon = 78.4497;
    const cursor = undefined;
    let geohash = null;

    if (redis && lat && lon && !cursor) {
      // Grid precision: 1 decimal place = ~11.1km grid cell
      geohash = `feed:geogrid:${lat.toFixed(1)}:${lon.toFixed(1)}`;
      const cachedFeed = await redis.get(geohash);
      if (cachedFeed) {
        console.log(`[Feed] Cache HIT for Geogrid ${geohash}`);
        return;
      }
    }

    console.log(`[Feed] Cache MISS for Geogrid ${geohash}`);

    let query = `
      SELECT 
        j.*, 
        u.name as provider_name, 
        u.avatar_url as provider_avatar,
        u.trust_score as provider_trust_score,
        u.ab_group as provider_ab_group
      FROM jobs j
      JOIN users u ON j.provider_id = u.id
      WHERE j.status = 'active' AND u.is_deleted = FALSE
      ORDER BY j.created_at DESC LIMIT 20;
    `;
    const params = [];
    const result = await db.query(query, params);
    
    const jobs = result.rows.map(row => ({
      ...row,
      provider: {
        name: row.provider_name,
        profile_image: row.provider_avatar,
        trust_score: row.provider_trust_score
      }
    }));

    if (redis && geohash && jobs.length > 0) {
      await redis.setex(geohash, 180, JSON.stringify(jobs));
    }
    console.log("Success!");
  } catch (error) {
    console.error('Crash:', error);
  } finally {
    process.exit(0);
  }
}
testFeed();
