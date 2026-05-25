-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ADD GEOGRAPHY COLUMN TO JOBS
-- Add a PostGIS geography column (Point) to store coordinates efficiently
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point);

-- Backfill existing data into the new location column
UPDATE jobs 
SET location = ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL AND location IS NULL;

-- 2. ADD GEOGRAPHY COLUMN TO USERS (for saved locations / tracking)
ALTER TABLE users ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point);
UPDATE users 
SET location = ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL AND location IS NULL;

-- 3. APPLY GIST INDEXES
-- Critical for ST_DWithin performance
CREATE INDEX IF NOT EXISTS idx_jobs_location_gist ON jobs USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_users_location_gist ON users USING GIST (location);

-- 4. ENFORCE UNIQUE CONSTRAINTS (Prevent duplicate data)
-- Users: Prevent duplicate accounts
ALTER TABLE users ADD CONSTRAINT unique_firebase_uid UNIQUE (firebase_uid);
ALTER TABLE users ADD CONSTRAINT unique_phone UNIQUE (phone);

-- Applications: A worker can only apply to a specific job once
ALTER TABLE applications ADD CONSTRAINT unique_job_worker UNIQUE (job_id, applicant_id);

-- 5. NEARBY JOBS RPC ALGORITHM
-- This function allows the frontend to call Supabase via .rpc() to fetch jobs 
-- sorted purely by distance using PostGIS, with pagination.
CREATE OR REPLACE FUNCTION get_nearby_jobs(
  user_lat double precision,
  user_lng double precision,
  radius_meters double precision,
  limit_val integer DEFAULT 20,
  offset_val integer DEFAULT 0
) 
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM jobs
  WHERE status = 'open' 
    AND ST_DWithin(
      location, 
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326), 
      radius_meters
    )
  ORDER BY 
    ST_Distance(
      location, 
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
    ) ASC,
    created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
-- Drop the previous function if it exists
DROP FUNCTION IF EXISTS get_nearby_jobs(double precision, double precision, double precision, integer, integer);

-- Create new function returning JSON to include joined tables
CREATE OR REPLACE FUNCTION get_nearby_jobs(
  user_lat double precision,
  user_lng double precision,
  radius_meters double precision,
  limit_val integer DEFAULT 20,
  offset_val integer DEFAULT 0
) 
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', j.id,
      'title', j.title,
      'description', j.description,
      'provider_id', j.provider_id,
      'category_id', j.category_id,
      'salary', j.salary,
      'salary_type', j.salary_type,
      'status', j.status,
      'created_at', j.created_at,
      'location_lat', j.location_lat,
      'location_lng', j.location_lng,
      'distance_meters', ST_Distance(j.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)),
      'provider', json_build_object(
        'name', u.name,
        'profile_image', u.profile_image,
        'trust_score', u.trust_score,
        'reports', u.reports
      )
    )
  )
  INTO result
  FROM jobs j
  LEFT JOIN users u ON j.provider_id = u.id
  WHERE j.status = 'active' 
    AND j.is_deleted = false
    AND ST_DWithin(
      j.location, 
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326), 
      radius_meters
    )
  ORDER BY 
    ST_Distance(j.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)) ASC,
    j.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;
