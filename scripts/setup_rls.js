const { Client } = require('pg');
require('dotenv').config();

const RLS_SQL = `
BEGIN;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

-- 1. USERS: Anyone can read profiles. Users can only update their own profile.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
-- (Insert policy removed: User creation is handled securely by the backend via Service Role Key)

-- 2. JOBS: Anyone can read jobs. Providers can insert/update their own jobs.
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON jobs;
CREATE POLICY "Jobs are viewable by everyone" ON jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Providers can insert their own jobs" ON jobs;
CREATE POLICY "Providers can insert their own jobs" ON jobs FOR INSERT WITH CHECK (
  poster_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
);

DROP POLICY IF EXISTS "Providers can update their own jobs" ON jobs;
CREATE POLICY "Providers can update their own jobs" ON jobs FOR UPDATE USING (
  poster_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 3. APPLICATIONS: Providers see apps for their jobs. Seekers see their own apps.
DROP POLICY IF EXISTS "Seekers see own apps, Providers see apps for their jobs" ON applications;
CREATE POLICY "Seekers see own apps, Providers see apps for their jobs" ON applications FOR SELECT USING (
  applicant_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
  OR
  employer_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
);

DROP POLICY IF EXISTS "Seekers can apply to jobs" ON applications;
CREATE POLICY "Seekers can apply to jobs" ON applications FOR INSERT WITH CHECK (
  applicant_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 4. SAVED ADDRESSES: Users can only see/edit their own addresses
DROP POLICY IF EXISTS "Users can manage own addresses" ON saved_addresses;
CREATE POLICY "Users can manage own addresses" ON saved_addresses FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 5. MESSAGES & CHAT_ROOMS: Participants only
DROP POLICY IF EXISTS "Participants can access chat rooms" ON chat_rooms;
CREATE POLICY "Participants can access chat rooms" ON chat_rooms FOR ALL USING (
  employer_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
  OR
  seeker_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
);

DROP POLICY IF EXISTS "Participants can access messages" ON messages;
CREATE POLICY "Participants can access messages" ON messages FOR ALL USING (
  sender_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub')
  OR
  room_id IN (SELECT id FROM chat_rooms WHERE employer_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub') OR seeker_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'))
);

COMMIT;
`;

async function runRlsMigration() {
  const client = new Client({ connectionString: process.env.DB_CONNECTION_STRING });
  try {
    await client.connect();
    console.log('✅ Connected to Supabase!');
    console.log('📋 Running RLS migration...');
    await client.query(RLS_SQL);
    console.log('✅ RLS Policies successfully applied!');
  } catch (error) {
    console.error('❌ RLS Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

runRlsMigration();
