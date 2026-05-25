-- ============================================================
-- NearWork Phase 3 Application Tracking & Flow Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Job Applications Additions ──────────────────────────
-- Add message (cover letter) column for the seeker's application text
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS message VARCHAR(300);

-- Refresh the view to ensure tools or PostgREST see the new column
NOTIFY pgrst, 'reload schema';
