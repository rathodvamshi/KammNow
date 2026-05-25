-- ============================================================
-- NearWork Phase 5: Ratings & Trust Scores
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Update Users Table ─────────────────────────────────────
-- Add trust_score if it doesn't exist. Default is 50.
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score NUMERIC DEFAULT 50.0;

-- ── 2. Restructure Reviews Table ──────────────────────────────
-- Drop the restrictive unique constraint preventing repeat reviews
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_from_user_id_to_user_id_key;

-- Add new columns to track the exact job the review is for
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE;

-- Enforce unique reviews per (user, job) to prevent double ratings on the same job
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_review_per_job'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT unique_review_per_job UNIQUE(from_user_id, job_id);
  END IF;
END $$;

-- ── 3. Reports Table Verification ─────────────────────────────
-- Make sure the reports table is structured for our new reporting flow
ALTER TABLE reports ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL;

-- ── 4. RLS Updates ────────────────────────────────────────────
-- Allow inserts for reviews and reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert reviews'
  ) THEN
    CREATE POLICY "Allow insert reviews" ON reviews FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert reports'
  ) THEN
    CREATE POLICY "Allow insert reports" ON reports FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
