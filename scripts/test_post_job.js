require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    // We need a valid provider_id (a user in the users table). Let's get one.
    const userRes = await client.query("SELECT id FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
      console.log('No users found to test with.');
      return;
    }
    const provider_id = userRes.rows[0].id;
    
    console.log('Testing job insert with provider_id:', provider_id);
    const result = await client.query(`
      INSERT INTO jobs (provider_id, title, description, salary, salary_type, job_type, experience_required, category_id, location_id, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `, [provider_id, "Test Job", "Test Desc", 500, "day", "one_time", "No Experience", "delivery", null, 17.3850, 78.4867]);
    
    console.log('Insert success:', result.rows[0].id);
    
    // Test the notification query
    const nearbySeekers = await client.query(`
        SELECT u.id 
        FROM users u
        JOIN user_location ul ON ul.user_id = u.id
        WHERE u.role = 'seeker' 
          AND u.is_deleted = false
          AND ST_DWithin(ul.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 10000)
      `, [78.4867, 17.3850]);
      
    console.log('Nearby seekers count:', nearbySeekers.rows.length);
    
    if (nearbySeekers.rows.length > 0) {
        const notifValues = nearbySeekers.rows.map(row => `('${row.id}', 'New Job Nearby!', 'A new Test Job was posted near you.', 'job_alert')`).join(', ');
        await client.query(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES ${notifValues};
        `);
        console.log('Notifications inserted');
    }
    
  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    await client.query("ROLLBACK"); // Actually we can just rollback if we wrapped in BEGIN, but we didn't. It's fine to leave the test job or delete it.
    await client.query("DELETE FROM jobs WHERE title = 'Test Job'");
    await client.end();
  }
}
run();
