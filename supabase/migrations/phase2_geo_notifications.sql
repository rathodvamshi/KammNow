-- ============================================================
-- NearWork Phase 2 Geo Engine + Notifications Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Users Table Additions ───────────────────────────────
-- Add last_active_at for filtering stale users in geo queries
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Add fcm_token for Firebase Cloud Messaging pushes
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Index for quickly filtering active users
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users (last_active_at DESC);


-- ── 2. Notifications Table Upgrades ────────────────────────
-- Add JSONB data column for flexible routing payload (e.g., job_id)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add distance_km to show "2.3 km away" on the notification UI
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS distance_km NUMERIC;

-- Link to jobs table explicitly (optional, but good for joins)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;


-- ── 3. Backfill last_active_at ─────────────────────────────
UPDATE users SET last_active_at = COALESCE(updated_at, created_at) WHERE last_active_at IS NULL;
