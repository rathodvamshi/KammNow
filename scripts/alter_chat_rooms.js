require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  await client.query(`
    ALTER TABLE chat_rooms 
    ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS seeker_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);
  
  console.log("Chat rooms altered successfully.");
  await client.end();
}
run();
