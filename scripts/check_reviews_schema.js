require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%review%';`);
  console.table(res.rows);
  const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reviews';`);
  console.table(cols.rows);
  await client.end();
}
run();
