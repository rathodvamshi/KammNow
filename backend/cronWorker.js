require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const cron = require('node-cron');
const db = require('./db');
const { redis } = require('./redis');

console.log('[CronWorker] Starting NearWork background cron jobs...');

// ── 1. Auto-Expire Jobs (Daily at Midnight) ──────────────────────────────
cron.schedule('0 0 * * *', async () => {
  console.log('[CronWorker] Running daily job expiration check...');
  try {
    const result = await db.query(`
      UPDATE jobs 
      SET status = 'expired', updated_at = NOW()
      WHERE created_at < NOW() - INTERVAL '30 days'
        AND status = 'active'
      RETURNING id;
    `);
    console.log(`[CronWorker] Expired ${result.rowCount} stale jobs.`);
  } catch (err) {
    console.error('[CronWorker] Error expiring jobs:', err);
  }
});

// ── 2. Fraud Detection Scan (Daily at 1 AM) ──────────────────────────────
cron.schedule('0 1 * * *', async () => {
  console.log('[CronWorker] Running daily fraud detection scan...');
  try {
    // Suspend users with 3+ reports in the last 30 days
    const result = await db.query(`
      WITH bad_actors AS (
        SELECT reported_user_id
        FROM reports
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY reported_user_id
        HAVING COUNT(*) >= 3
      )
      UPDATE users 
      SET is_suspended = TRUE
      WHERE id IN (SELECT reported_user_id FROM bad_actors)
        AND COALESCE(is_suspended, FALSE) = FALSE
      RETURNING id;
    `);
    
    if (result.rowCount > 0) {
      console.log(`[CronWorker] Suspended ${result.rowCount} users for fraud/reports.`);
      
      // Also suspend their active jobs
      const userIds = result.rows.map(row => `'${row.id}'`).join(',');
      await db.query(`
        UPDATE jobs SET status = 'suspended' 
        WHERE provider_id IN (${userIds}) AND status = 'active';
      `);
    }
  } catch (err) {
    console.error('[CronWorker] Error in fraud detection:', err);
  }
});

// ── 3. Trust Score Floor Check (Daily at 2 AM) ───────────────────────────
cron.schedule('0 2 * * *', async () => {
  console.log('[CronWorker] Running daily trust score floor check...');
  try {
    const result = await db.query(`
      UPDATE users 
      SET is_suspended = TRUE
      WHERE trust_score < 20 
        AND COALESCE(is_suspended, FALSE) = FALSE
        AND role = 'provider'
      RETURNING id, name, email;
    `);
    
    if (result.rowCount > 0) {
      console.log(`[CronWorker] Suspended ${result.rowCount} users for low trust score (<20).`);
      
      // Suspend their active jobs
      const userIds = result.rows.map(row => `'${row.id}'`).join(',');
      await db.query(`
        UPDATE jobs SET status = 'suspended' 
        WHERE provider_id IN (${userIds}) AND status = 'active';
      `);
      
      // Mock sending warning emails
      result.rows.forEach(user => {
        console.log(`[Email Service] Warning email sent to ${user.name} (${user.email || 'no-email'}): Account suspended due to low trust score.`);
      });
    }
  } catch (err) {
    console.error('[CronWorker] Error in trust score check:', err);
  }
});

// ── 4. Pre-Compute Feeds for Top Cities (Every 5 mins) ────────────────────
const TOP_CITIES = [
  { name: 'mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'delhi', lat: 28.7041, lon: 77.1025 },
  { name: 'bangalore', lat: 12.9716, lon: 77.5946 }
];

cron.schedule('*/5 * * * *', async () => {
  console.log('[CronWorker] Running 5-min feed pre-computation...');
  if (!redis) {
    console.warn('[CronWorker] Redis not connected, skipping pre-computation.');
    return;
  }

  try {
    for (const city of TOP_CITIES) {
      const res = await db.query(`
        SELECT 
          j.*, 
          u.name as provider_name, 
          u.avatar_url as provider_avatar,
          u.trust_score as provider_trust_score,
          (
            6371 * acos(cos(radians($1)) * cos(radians(j.location_lat)) * cos(radians(j.location_lng) - radians($2)) + sin(radians($1)) * sin(radians(j.location_lat)))
          ) AS distance_km
        FROM jobs j
        JOIN users u ON j.provider_id = u.id
        WHERE j.status = 'active' 
          AND j.location_lat IS NOT NULL
          AND COALESCE(u.is_suspended, FALSE) = FALSE
        ORDER BY 
          u.trust_score - ((
            6371 * acos(cos(radians($1)) * cos(radians(j.location_lat)) * cos(radians(j.location_lng) - radians($2)) + sin(radians($1)) * sin(radians(j.location_lat)))
          ) * 2) DESC,
          j.created_at DESC
        LIMIT 50;
      `, [city.lat, city.lon]);

      const cacheKey = `feed:cache:${city.name}`;
      await redis.set(cacheKey, JSON.stringify(res.rows), 'EX', 300);
      console.log(`[CronWorker] Cached ${res.rowCount} top jobs for ${city.name}`);
    }
  } catch (err) {
    console.error('[CronWorker] Error pre-computing feeds:', err);
  }
});

// Run once on startup just to populate
setTimeout(() => {
  console.log('[CronWorker] Initial run for feed pre-computation...');
}, 2000);
