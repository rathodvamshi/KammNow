require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

const SQL = `
-- Drop foreign key for category_id
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_category_id_fkey;

-- Change category_id type to TEXT
ALTER TABLE jobs ALTER COLUMN category_id TYPE TEXT USING category_id::TEXT;

-- Drop check constraint on job_type so we can accept any string like 'hour', 'day', 'month'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Drop check constraint on salary_type just in case
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_salary_type_check;
`;

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Fixing jobs table schema...');
  await client.query(SQL);
  console.log('Jobs table fixed!');
  await client.end();
}
run();
