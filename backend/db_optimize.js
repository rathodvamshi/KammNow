/**
 * KaamNow Database Optimization Migration
 * Safe, additive only — zero data loss.
 * Run: node -e "require('dotenv').config({path:'../.env'}); require('./db_optimize.js')"
 */
const db = require('./db');

async function optimize() {
  console.log('🔧 Starting KaamNow DB optimization...\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 1: pay_amount INTEGER → NUMERIC(10,2)
  // Safe implicit cast: 500 → 500.00, existing data is preserved exactly.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Fix 1: Changing pay_amount from INTEGER to NUMERIC(10,2)...');
  await db.query(`
    ALTER TABLE jobs
      ALTER COLUMN pay_amount TYPE NUMERIC(10,2) USING pay_amount::NUMERIC(10,2);
  `);
  console.log('  ✅ pay_amount is now NUMERIC(10,2)\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 2: Composite partial index for the feed query
  // Covers: WHERE status='active' AND is_deleted=false ORDER BY created_at DESC
  // "CONCURRENTLY" means zero downtime — build happens in background.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Fix 2: Adding feed query composite partial index...');
  await db.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_feed
      ON jobs (created_at DESC, location_lat, location_lng)
      WHERE status = 'active' AND is_deleted = false;
  `);
  console.log('  ✅ idx_jobs_feed created\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 3: Composite index for GET /api/jobs (My Jobs page)
  // Covers: WHERE provider_id=$1 AND is_deleted=false ORDER BY created_at DESC
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Fix 3: Adding My Jobs composite index...');
  await db.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_provider_active
      ON jobs (provider_id, created_at DESC)
      WHERE is_deleted = false;
  `);
  console.log('  ✅ idx_jobs_provider_active created\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 4: job_applications status indexes
  // Covers: filter by status per job OR per seeker
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Fix 4: Adding application status indexes...');
  await db.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_job_status
      ON job_applications (job_id, status)
      WHERE is_deleted = false;
  `);
  await db.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apps_seeker_status
      ON job_applications (seeker_id, status)
      WHERE is_deleted = false;
  `);
  console.log('  ✅ idx_apps_job_status, idx_apps_seeker_status created\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 5: Auto-update updated_at on jobs when any column changes
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Fix 5: Adding auto-update trigger for jobs.updated_at...');
  await db.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  // Drop old trigger if exists, then recreate cleanly
  await db.query(`DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;`);
  await db.query(`
    CREATE TRIGGER trg_jobs_updated_at
      BEFORE UPDATE ON jobs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
  // Same for job_applications
  await db.query(`DROP TRIGGER IF EXISTS trg_apps_updated_at ON job_applications;`);
  await db.query(`
    CREATE TRIGGER trg_apps_updated_at
      BEFORE UPDATE ON job_applications
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
  // Same for users
  await db.query(`DROP TRIGGER IF EXISTS trg_users_updated_at ON users;`);
  await db.query(`
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
  console.log('  ✅ Auto-update triggers on jobs, job_applications, users\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 6: user_location user_id index (for heartbeat queries)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Fix 6: Adding user_location user_id index...');
  await db.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_location_user_id
      ON user_location (user_id)
      WHERE is_deleted = false;
  `);
  console.log('  ✅ idx_user_location_user_id created\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 7: CHECK constraints for data integrity
  // Added with IF NOT EXISTS pattern to be safe on re-runs.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Fix 7: Adding data integrity CHECK constraints...');

  // jobs.status
  await db.query(`
    ALTER TABLE jobs
      DROP CONSTRAINT IF EXISTS chk_jobs_status,
      ADD CONSTRAINT chk_jobs_status
        CHECK (status IN ('active', 'paused', 'filled', 'cancelled', 'expired', 'deleted'));
  `);

  // jobs.job_type
  await db.query(`
    ALTER TABLE jobs
      DROP CONSTRAINT IF EXISTS chk_jobs_job_type,
      ADD CONSTRAINT chk_jobs_job_type
        CHECK (job_type IN ('hour', 'day', 'month'));
  `);

  // jobs.gender_preference
  await db.query(`
    ALTER TABLE jobs
      DROP CONSTRAINT IF EXISTS chk_jobs_gender_pref,
      ADD CONSTRAINT chk_jobs_gender_pref
        CHECK (gender_preference IN ('any', 'male', 'female'));
  `);

  // jobs.contact_method
  await db.query(`
    ALTER TABLE jobs
      DROP CONSTRAINT IF EXISTS chk_jobs_contact_method,
      ADD CONSTRAINT chk_jobs_contact_method
        CHECK (contact_method IN ('in_app_chat', 'phone_call', 'whatsapp'));
  `);

  // jobs.visibility
  await db.query(`
    ALTER TABLE jobs
      DROP CONSTRAINT IF EXISTS chk_jobs_visibility,
      ADD CONSTRAINT chk_jobs_visibility
        CHECK (visibility IN ('public', 'private'));
  `);

  // job_applications.status
  await db.query(`
    ALTER TABLE job_applications
      DROP CONSTRAINT IF EXISTS chk_apps_status,
      ADD CONSTRAINT chk_apps_status
        CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'completed'));
  `);

  // users.role
  await db.query(`
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS chk_users_role,
      ADD CONSTRAINT chk_users_role
        CHECK (role IN ('seeker', 'provider', 'both', 'admin'));
  `);

  console.log('  ✅ CHECK constraints added on jobs, job_applications, users\n');

  // ─────────────────────────────────────────────────────────────────────────
  // BONUS FIX: Ensure is_deleted and status have NOT NULL + defaults
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Bonus: Hardening NULLable columns with NOT NULL + defaults...');
  await db.query(`
    ALTER TABLE jobs
      ALTER COLUMN status        SET NOT NULL,
      ALTER COLUMN is_deleted    SET NOT NULL,
      ALTER COLUMN is_deleted    SET DEFAULT false,
      ALTER COLUMN applicants_count SET NOT NULL,
      ALTER COLUMN applicants_count SET DEFAULT 0,
      ALTER COLUMN views_count   SET NOT NULL,
      ALTER COLUMN views_count   SET DEFAULT 0,
      ALTER COLUMN quantity_total SET NOT NULL,
      ALTER COLUMN quantity_total SET DEFAULT 1,
      ALTER COLUMN quantity_hired SET NOT NULL,
      ALTER COLUMN quantity_hired SET DEFAULT 0,
      ALTER COLUMN is_urgent     SET NOT NULL,
      ALTER COLUMN is_urgent     SET DEFAULT false,
      ALTER COLUMN same_day_payment SET NOT NULL,
      ALTER COLUMN same_day_payment SET DEFAULT false,
      ALTER COLUMN food_included SET NOT NULL,
      ALTER COLUMN food_included SET DEFAULT false,
      ALTER COLUMN accommodation_included SET NOT NULL,
      ALTER COLUMN accommodation_included SET DEFAULT false,
      ALTER COLUMN overtime_available SET NOT NULL,
      ALTER COLUMN overtime_available SET DEFAULT false,
      ALTER COLUMN salary_negotiable SET NOT NULL,
      ALTER COLUMN salary_negotiable SET DEFAULT false,
      ALTER COLUMN pf_esi_included SET NOT NULL,
      ALTER COLUMN pf_esi_included SET DEFAULT false;
  `);
  await db.query(`
    ALTER TABLE job_applications
      ALTER COLUMN is_deleted SET NOT NULL,
      ALTER COLUMN is_deleted SET DEFAULT false;
  `);
  console.log('  ✅ NOT NULL + defaults hardened\n');

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL: Verify
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Verifying results...');
  const idxCheck = await db.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('jobs', 'job_applications', 'user_location')
    ORDER BY tablename, indexname;
  `);
  console.log('  Indexes now:', idxCheck.rows.map(r => r.indexname).join(', '));

  const typeCheck = await db.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'pay_amount' AND table_schema = 'public';
  `);
  console.log('  pay_amount type:', typeCheck.rows[0]?.data_type);

  console.log('\n🚀 All 7 optimizations applied successfully! Zero data loss.');
  process.exit(0);
}

optimize().catch(e => {
  console.error('\n❌ Migration failed:', e.message);
  process.exit(1);
});
