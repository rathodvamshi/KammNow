require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

const SQL = `
-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add coordinates to jobs if missing
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- 3. Add geometry column to jobs and user_location
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
ALTER TABLE user_location ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

-- 4. Create trigger to auto-update geom from lat/lng for user_location
CREATE OR REPLACE FUNCTION update_user_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_location_geom ON user_location;
CREATE TRIGGER trg_update_user_location_geom
BEFORE INSERT OR UPDATE ON user_location
FOR EACH ROW EXECUTE FUNCTION update_user_location_geom();

-- 5. Create trigger to auto-update geom from lat/lng for jobs
CREATE OR REPLACE FUNCTION update_jobs_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_jobs_geom ON jobs;
CREATE TRIGGER trg_update_jobs_geom
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION update_jobs_geom();

-- 6. Update existing rows if any
UPDATE user_location SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;
UPDATE jobs SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

-- 7. Add index for fast spatial queries
CREATE INDEX IF NOT EXISTS jobs_geom_idx ON jobs USING GIST (geom);
CREATE INDEX IF NOT EXISTS user_location_geom_idx ON user_location USING GIST (geom);
`;

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to DB. Running PostGIS migration...');
  await client.query(SQL);
  console.log('PostGIS Migration Success!');
  await client.end();
}
run();
