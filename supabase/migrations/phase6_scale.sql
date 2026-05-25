-- ============================================================
-- NearWork Phase 6: Feed Ranking & Scale
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Skills Arrays & GIN Indexes ───────────────────────────
-- Ensure users have a skills array (already exists from prior migrations, but ensuring safety)
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Add skills array to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Create native Postgres GIN Indexes for ultra-fast array overlapping matches
CREATE INDEX IF NOT EXISTS idx_users_skills_gin ON users USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_jobs_skills_gin ON jobs USING GIN (skills);

-- ── 2. Job Denormalization (Geo for Feed) ─────────────────────
-- To support the composite index (lat, lon, status, created_at) requested for Phase 6, 
-- we denormalize latitude and longitude directly onto the jobs table.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;

-- Backfill lat/lon from user_location for existing jobs
UPDATE jobs j
SET lat = ul.latitude,
    lon = ul.longitude
FROM user_location ul
WHERE j.location_id = ul.id
  AND j.lat IS NULL;

-- ── 3. Composite Index ────────────────────────────────────────
-- This index enables lightning-fast feed queries covering spatial + temporal + status filtering
CREATE INDEX IF NOT EXISTS idx_jobs_feed ON jobs (lat, lon, status, created_at DESC);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
