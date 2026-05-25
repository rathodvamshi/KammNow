require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

const SQL = `
ALTER TABLE jobs ALTER COLUMN experience_required TYPE TEXT USING experience_required::TEXT;
`;

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Fixing experience_required column...');
  await client.query(SQL);
  console.log('Done!');
  await client.end();
}
run();
