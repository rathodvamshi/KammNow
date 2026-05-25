-- Database Indexing for Performance
-- Run these in your Supabase SQL Editor to improve query performance

-- 1. JOBS TABLE INDEXES
-- Index for quick status lookups (e.g., active, paused, deleted)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Index for distance sorting (PostGIS Extension Required if using geographical types, 
-- but assuming standard latitude/longitude numbers for now)
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location_lat, location_lng);

-- Index for provider lookups (fetching all jobs posted by a specific provider)
CREATE INDEX IF NOT EXISTS idx_jobs_provider_id ON jobs(provider_id);

-- Index for date sorting (used in feed)
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Composite index for fast matching queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_deleted ON jobs(status, is_deleted);


-- 2. USERS TABLE INDEXES
-- Phone number lookup (critical for auth)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Role lookup
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- 3. APPLICATIONS TABLE INDEXES
-- Lookups by applicant
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);

-- Lookups by job
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);

-- Lookups by status (e.g. pending, accepted)
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);


-- 4. SAVED ADDRESSES INDEXES
-- Lookups by user
CREATE INDEX IF NOT EXISTS idx_user_location_user_id ON user_location(user_id);


-- 5. RATINGS INDEXES
-- Lookups by reviewee (fetching ratings for a user)
CREATE INDEX IF NOT EXISTS idx_ratings_reviewee_id ON ratings(reviewee_id);

-- Lookups by reviewer
CREATE INDEX IF NOT EXISTS idx_ratings_reviewer_id ON ratings(reviewer_id);

-- Lookups by job
CREATE INDEX IF NOT EXISTS idx_ratings_job_id ON ratings(job_id);
