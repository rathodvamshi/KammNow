-- ============================================================
-- NearWork Phase 7: Analytics, Safety & Polish
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. User Safety & Suspensions ─────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- ── 2. Smart Notification Preferences (Quiet Hours) ──────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

-- ── 3. A/B Testing Framework ─────────────────────────────────
-- Group A (Control), Group B (Experimental - Distance heavy)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ab_group VARCHAR(1) DEFAULT 'A' CHECK (ab_group IN ('A', 'B'));

-- Optional: Randomly assign existing users to Group A or B
UPDATE users SET ab_group = CASE WHEN random() > 0.5 THEN 'A' ELSE 'B' END;

-- ── 4. Reports Table (Safety Net) ────────────────────────────
-- Ensure the reports table exists (from Phase 5)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
