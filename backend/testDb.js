const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

async function test() {
  const pool = new Pool({ connectionString: process.env.DB_CONNECTION_STRING });
  try {
    const res = await pool.query("SELECT * FROM jobs WHERE status = 'active'");
    console.log(`Found ${res.rowCount} active jobs`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
test();
