#!/usr/bin/env node
/**
 * KaamNow — Database Migration Script v2 (Production Architecture)
 * ================================================================
 * Connects directly to Supabase PostgreSQL and creates all tables.
 * 
 * Features: UUIDs, foreign keys, created_at/updated_at, soft deletes (is_deleted),
 * robust indexing, and RLS enabled by default.
 */

require('dotenv').config({ path: '../.env' });
require('dotenv').config(); // Fallback to current dir
const { Client } = require('pg');

const CONNECTION_STRING =
  process.env.DB_CONNECTION_STRING ||
  'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

const MIGRATION_SQL = `
BEGIN;

-- ============================================================
-- 1. Extensions & Shared Functions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Core Tables (Clean Slate)
-- ============================================================

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_location CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS saved_addresses CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid        TEXT        UNIQUE NOT NULL,
  phone               TEXT        UNIQUE NOT NULL,
  name                TEXT,
  profile_image       TEXT,
  role                TEXT        NOT NULL DEFAULT 'seeker' CHECK (role IN ('seeker', 'employer', 'provider')),
  bio                 TEXT,
  gender              TEXT,
  dob                 DATE,
  languages           TEXT[]      DEFAULT '{}',
  skills              TEXT[]      DEFAULT '{}',
  experience          INTEGER     DEFAULT 0,
  rating_average      NUMERIC(3,2) DEFAULT 0.00,
  rating_count        INTEGER     DEFAULT 0,
  is_verified         BOOLEAN     DEFAULT FALSE,
  is_profile_complete BOOLEAN     DEFAULT FALSE,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- User_Location
CREATE TABLE IF NOT EXISTS user_location (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  address             TEXT,
  city                TEXT,
  state               TEXT,
  country             TEXT,
  pincode             TEXT,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT        NOT NULL,
  icon                TEXT        NOT NULL,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id         UUID        REFERENCES categories(id) ON DELETE SET NULL,
  title               TEXT        NOT NULL,
  description         TEXT,
  salary              INTEGER,
  salary_type         TEXT        CHECK (salary_type IN ('hour', 'day', 'month', 'fixed')),
  job_type            TEXT        CHECK (job_type IN ('full_time', 'part_time', 'contract', 'one_time')),
  experience_required INTEGER     DEFAULT 0,
  location_id         UUID        REFERENCES user_location(id) ON DELETE SET NULL,
  status              TEXT        DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
  applicants_count    INTEGER     DEFAULT 0,
  views_count         INTEGER     DEFAULT 0,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Job_Applications
CREATE TABLE IF NOT EXISTS job_applications (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  seeker_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'completed', 'cancelled', 'cancellation_requested')),
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, seeker_id) -- Seeker can apply only once per job
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating              INTEGER     CHECK (rating >= 1 AND rating <= 5),
  review              TEXT,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id) -- Prevent duplicate reviews
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  message             TEXT        NOT NULL,
  type                TEXT        NOT NULL,
  is_read             BOOLEAN     DEFAULT FALSE,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Chat_Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID        REFERENCES jobs(id) ON DELETE CASCADE,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Chat_Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id             UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message             TEXT,
  message_type        TEXT        DEFAULT 'text',
  media_url           TEXT,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Media
CREATE TABLE IF NOT EXISTS media (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cloudinary_url      TEXT        NOT NULL,
  media_type          TEXT        NOT NULL,
  size                INTEGER,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id              UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_by         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason              TEXT        NOT NULL,
  status              TEXT        DEFAULT 'pending',
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Activity_Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action              TEXT        NOT NULL,
  metadata            JSONB,
  is_deleted          BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Triggers for updated_at
-- ============================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. High Performance Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

CREATE INDEX IF NOT EXISTS idx_jobs_provider_id ON jobs (provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs (category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);

CREATE INDEX IF NOT EXISTS idx_apps_job_id ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_apps_seeker_id ON job_applications (seeker_id);

CREATE INDEX IF NOT EXISTS idx_reviews_to_user ON reviews (to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_room_id ON chat_messages (room_id);
CREATE INDEX IF NOT EXISTS idx_chat_sender_id ON chat_messages (sender_id);

-- ============================================================
-- 5. Row Level Security (RLS) Enablement
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies (Read-Only for frontend). 
-- Write operations are handled via Service Role on the Backend.
DROP POLICY IF EXISTS "Public Read Access" ON users;
CREATE POLICY "Public Read Access" ON users FOR SELECT USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "Public Read Access" ON categories;
CREATE POLICY "Public Read Access" ON categories FOR SELECT USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "Public Read Access" ON jobs;
CREATE POLICY "Public Read Access" ON jobs FOR SELECT USING (is_deleted = FALSE);

-- Users can read their own applications
DROP POLICY IF EXISTS "Users Read Own Apps" ON job_applications;
CREATE POLICY "Users Read Own Apps" ON job_applications FOR SELECT USING (
  seeker_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
  OR
  job_id IN (
    SELECT id FROM jobs WHERE provider_id IN (
      SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

COMMIT;
`;

async function runMigration() {
  console.log('🔄 Starting KaamNow Production Database Migration...');
  console.log('Connecting to:', CONNECTION_STRING.replace(/:[^:@]+@/, ':***@'));

  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase!');
    
    console.log('📋 Running Schema Generation...');
    await client.query(MIGRATION_SQL);
    
    console.log('🎉 Production Schema Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
