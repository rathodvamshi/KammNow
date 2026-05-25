require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rooms = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'chat_rooms';`);
  const messages = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'chat_messages';`);
  
  console.log('CHAT_ROOMS:');
  console.table(rooms.rows);
  console.log('\nCHAT_MESSAGES:');
  console.table(messages.rows);
  await client.end();
}
run();
