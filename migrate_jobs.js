const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DB_CONNECTION_STRING
});

async function run() {
  await client.connect();
  
  const query = `
    -- Rename columns to match frontend
    ALTER TABLE jobs RENAME COLUMN category_id TO category;
    ALTER TABLE jobs RENAME COLUMN salary TO pay_amount;
    ALTER TABLE jobs RENAME COLUMN salary_type TO pay_type;
    ALTER TABLE jobs RENAME COLUMN latitude TO location_lat;
    ALTER TABLE jobs RENAME COLUMN longitude TO location_lng;

    -- Add missing columns from frontend
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quantity_total integer DEFAULT 1;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quantity_hired integer DEFAULT 0;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_name text;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS show_phone boolean DEFAULT false;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_skills text[];
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gender_preference text DEFAULT 'any';
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_method text DEFAULT 'in_app_chat';
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';
    
    -- Drop old unused columns
    ALTER TABLE jobs DROP COLUMN IF EXISTS experience_required;
    ALTER TABLE jobs DROP COLUMN IF EXISTS job_type;
  `;
  
  console.log("Running migration...");
  await client.query(query);
  console.log("Migration complete!");
  
  await client.end();
}

run().catch(console.error);
