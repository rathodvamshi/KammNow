/**
 * geo_radius_migration.js
 *
 * One-time migration script:
 *  1. Ensure PostGIS extension is enabled
 *  2. Backfill geom column on user_location if any rows are missing it
 *  3. Create GIST indexes on jobs.geom and user_location.geom (idempotent)
 *  4. Create supporting btree indexes for common filter queries
 *
 * Run: node geo_radius_migration.js
 */

require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const db = require('./db');

async function run() {
  console.log('🌍 Starting geo radius migration...\n');

  // 1. Enable PostGIS (safe to re-run)
  await db.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
  console.log('✅ PostGIS extension confirmed');

  // 2. Ensure geom column exists on user_location (already confirmed it does)
  //    Backfill any rows where geom is NULL but lat/lng exist
  const backfill = await db.query(`
    UPDATE user_location
    SET geom = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geometry
    WHERE geom IS NULL
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL;
  `);
  console.log(`✅ Backfilled user_location.geom for ${backfill.rowCount} rows`);

  // 3. GIST index on jobs.geom (critical for ST_DWithin / ST_Distance)
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_jobs_geom
    ON jobs USING GIST(geom);
  `);
  console.log('✅ Index: idx_jobs_geom (GIST)');

  // 4. GIST index on user_location.geom (critical for seeker proximity lookup)
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_location_geom
    ON user_location USING GIST(geom);
  `);
  console.log('✅ Index: idx_user_location_geom (GIST)');

  // 5. Btree indexes for common filter + join queries
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_jobs_status_deleted
    ON jobs(status, is_deleted)
    WHERE is_deleted = false;
  `);
  console.log('✅ Index: idx_jobs_status_deleted (partial btree)');

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_jobs_provider_id
    ON jobs(provider_id);
  `);
  console.log('✅ Index: idx_jobs_provider_id (btree)');

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
    ON users(firebase_uid);
  `);
  console.log('✅ Index: idx_users_firebase_uid (btree)');

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_location_user_id
    ON user_location(user_id);
  `);
  console.log('✅ Index: idx_user_location_user_id (btree)');

  // 6. Verify indexes were created
  const idx = await db.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('jobs', 'user_location', 'users')
      AND indexname IN (
        'idx_jobs_geom', 'idx_user_location_geom',
        'idx_jobs_status_deleted', 'idx_jobs_provider_id',
        'idx_users_firebase_uid', 'idx_user_location_user_id'
      )
    ORDER BY indexname;
  `);
  console.log(`\n📋 Verified ${idx.rowCount} indexes:`);
  idx.rows.forEach(r => console.log(`   ${r.indexname}`));

  console.log('\n🎉 Geo radius migration complete!');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
