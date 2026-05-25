require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

const SQL = `
ALTER TABLE user_location 
ADD COLUMN IF NOT EXISTS label TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS flat_house TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS landmark TEXT,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
`;

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to DB. Altering user_location table...');
  await client.query(SQL);
  console.log('Alter success!');
  await client.end();
}
run();
