require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING || 'postgresql://postgres:Rozipass%40369@db.ekjigsgdhikukwydzwbf.supabase.co:5432/postgres';

const SQL = `
CREATE OR REPLACE FUNCTION get_nearby_jobs(user_lat numeric, user_lng numeric, radius_meters float, limit_val int, offset_val int)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  salary numeric,
  salary_type text,
  category_id text,
  provider_id uuid,
  status text,
  created_at timestamptz,
  latitude numeric,
  longitude numeric,
  distance_meters float,
  provider json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.description,
    j.salary,
    j.salary_type,
    j.category_id,
    j.provider_id,
    j.status,
    j.created_at,
    j.latitude,
    j.longitude,
    ST_Distance(j.geom::geography, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) as distance_meters,
    json_build_object(
      'id', u.id,
      'name', u.name,
      'profile_image', u.avatar_url,
      'trust_score', u.trust_score,
      'reports', u.reports
    ) as provider
  FROM jobs j
  JOIN users u ON j.provider_id = u.id
  WHERE j.is_deleted = false
    AND j.status = 'active'
    AND j.geom IS NOT NULL
    AND ST_DWithin(j.geom::geography, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
  ORDER BY distance_meters ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
`;

async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected. Creating get_nearby_jobs RPC...');
  await client.query(SQL);
  console.log('RPC Created Successfully!');
  await client.end();
}
run();
