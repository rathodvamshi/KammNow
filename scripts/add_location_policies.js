require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

const SQL = `
DROP POLICY IF EXISTS "Users can insert their own locations" ON user_location;
CREATE POLICY "Users can insert their own locations" 
ON user_location FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'));

DROP POLICY IF EXISTS "Users can update their own locations" ON user_location;
CREATE POLICY "Users can update their own locations" 
ON user_location FOR UPDATE 
USING (user_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'));

DROP POLICY IF EXISTS "Users can select their own locations" ON user_location;
CREATE POLICY "Users can select their own locations" 
ON user_location FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'));
`;

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to DB. Adding RLS policies for user_location...');
  await client.query(SQL);
  console.log('Policies added successfully!');
  await client.end();
}
run();
