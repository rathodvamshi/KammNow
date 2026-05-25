require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  await client.query(`
    CREATE OR REPLACE FUNCTION update_user_ratings()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users
      SET worker_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM reviews
        WHERE to_user_id = NEW.to_user_id AND is_deleted = false
      ),
      trust_score = LEAST(100, GREATEST(0, (
        SELECT 50 + (COALESCE(AVG(rating), 0) - 3) * 10 + COUNT(id) * 2
        FROM reviews
        WHERE to_user_id = NEW.to_user_id AND is_deleted = false
      )))
      WHERE id = NEW.to_user_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS review_inserted ON reviews;
    CREATE TRIGGER review_inserted
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ratings();
  `);
  
  console.log("Trigger created successfully.");
  await client.end();
}
run();
