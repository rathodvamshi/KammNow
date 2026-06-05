/**
 * Migration: add all work-type-specific job fields
 * Run: node -e "require('dotenv').config({path:'../.env'}); require('./migrate_jobs.js')"
 */
const db = require('./db');

async function migrate() {
  console.log('Running jobs table migration...');
  
  await db.query(`
    ALTER TABLE jobs
      -- Common work-type fields
      ADD COLUMN IF NOT EXISTS job_type         TEXT DEFAULT 'day',
      ADD COLUMN IF NOT EXISTS shift_start      TEXT,
      ADD COLUMN IF NOT EXISTS shift_end        TEXT,
      ADD COLUMN IF NOT EXISTS total_hours      NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS same_day_payment BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS full_address     TEXT,

      -- Hourly-specific  (job_type = 'hour')
      -- (hourly_rate is stored in pay_amount, shift times in shift_start/shift_end)

      -- Daily-specific   (job_type = 'day')
      ADD COLUMN IF NOT EXISTS number_of_days         INTEGER,
      ADD COLUMN IF NOT EXISTS start_date             DATE,
      ADD COLUMN IF NOT EXISTS food_included          BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS accommodation_included BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS overtime_available     BOOLEAN DEFAULT FALSE,

      -- Monthly-specific (job_type = 'month')
      ADD COLUMN IF NOT EXISTS joining_date            DATE,
      ADD COLUMN IF NOT EXISTS working_days_per_week   TEXT DEFAULT '6 Days',
      ADD COLUMN IF NOT EXISTS experience_required     TEXT DEFAULT 'No Experience',
      ADD COLUMN IF NOT EXISTS salary_negotiable       BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS pf_esi_included         BOOLEAN DEFAULT FALSE
    ;
  `);

  console.log('✅ Migration complete — all new columns added to jobs table.');
  process.exit(0);
}

migrate().catch(e => { console.error('Migration FAILED:', e.message); process.exit(1); });
