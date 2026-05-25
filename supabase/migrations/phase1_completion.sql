-- ============================================================
-- NearWork Phase 1 Completion Migration
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 1. GEOHASH COLUMNS ──────────────────────────────────────
-- Add geohash for bounding-box pre-filter (O(1) prefix scan)
ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS geohash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS geohash TEXT;

-- Backfill geohash for existing rows that have location geometry
UPDATE jobs  SET geohash = ST_GeoHash(location::geometry, 7) WHERE location IS NOT NULL;
UPDATE users SET geohash = ST_GeoHash(location::geometry, 7) WHERE location IS NOT NULL;

-- Index for prefix-scan queries: WHERE geohash LIKE 'tdr1u%'
CREATE INDEX IF NOT EXISTS idx_jobs_geohash  ON jobs  (geohash text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_users_geohash ON users (geohash text_pattern_ops);

-- Auto-maintain geohash via trigger
CREATE OR REPLACE FUNCTION sync_geohash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    NEW.geohash := ST_GeoHash(NEW.location::geometry, 7);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_geohash  ON jobs;
DROP TRIGGER IF EXISTS trg_users_geohash ON users;

CREATE TRIGGER trg_jobs_geohash
  BEFORE INSERT OR UPDATE OF location ON jobs
  FOR EACH ROW EXECUTE FUNCTION sync_geohash();

CREATE TRIGGER trg_users_geohash
  BEFORE INSERT OR UPDATE OF location ON users
  FOR EACH ROW EXECUTE FUNCTION sync_geohash();


-- ── 2. REQUIRED_SKILLS + FULL_ADDRESS ON JOBS ───────────────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS full_address    TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_name  TEXT;


-- ── 3. TRUST SCORE FUNCTION ──────────────────────────────────
-- Implements the full NearWork Trust Score formula:
--   TrustScore = W_rating × WeightedRatingAvg
--              + W_complete × CompletionRate
--              + W_verify × VerifiedBonus
--              + W_response × ResponseRate
--              - W_cancel × CancellationPenalty
--              - W_report × ReportPenalty
-- Score range: 0–100
CREATE OR REPLACE FUNCTION calculate_trust_score(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_score             NUMERIC := 0;
  v_weighted_rating   NUMERIC := 0;
  v_rating_count      INTEGER := 0;
  v_completion_rate   NUMERIC := 0;
  v_response_rate     NUMERIC := 0;
  v_verified_bonus    NUMERIC := 0;
  v_cancel_penalty    NUMERIC := 0;
  v_report_penalty    NUMERIC := 0;
  v_total_weight      NUMERIC := 0;

  -- Weights (must sum to 1.0 for the variable components)
  W_RATING    CONSTANT NUMERIC := 0.35;
  W_COMPLETE  CONSTANT NUMERIC := 0.25;
  W_RESPONSE  CONSTANT NUMERIC := 0.15;
  -- Verified bonus is additive (hard ceiling), not a weight
  LAMBDA      CONSTANT NUMERIC := 0.02; -- exponential decay rate (days)

  r RECORD;
BEGIN
  -- ── Weighted Rating Average (exponential time decay) ──────
  -- weight = e^(-λ × days_ago); a 7-day-old rating ≈ 87% weight
  FOR r IN
    SELECT
      score,
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 AS days_ago
    FROM ratings
    WHERE ratee_id = p_user_id
      AND score IS NOT NULL
  LOOP
    DECLARE
      w NUMERIC := exp(-LAMBDA * r.days_ago);
    BEGIN
      v_weighted_rating := v_weighted_rating + (r.score * w);
      v_total_weight    := v_total_weight + w;
      v_rating_count    := v_rating_count + 1;
    END;
  END LOOP;

  -- Normalise to 0–100
  IF v_total_weight > 0 THEN
    -- score is 1–5, scale to 0–100
    v_weighted_rating := ((v_weighted_rating / v_total_weight) / 5.0) * 100.0;
  ELSE
    v_weighted_rating := 50; -- No ratings yet → neutral baseline
  END IF;

  -- ── Completion Rate ───────────────────────────────────────
  -- = completed_applications / (completed + abandoned)
  DECLARE
    v_completed  INTEGER;
    v_abandoned  INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_completed
    FROM applications
    WHERE (applicant_id = p_user_id OR employer_id = p_user_id)
      AND status = 'completed';

    SELECT COUNT(*) INTO v_abandoned
    FROM applications
    WHERE (applicant_id = p_user_id OR employer_id = p_user_id)
      AND status IN ('cancelled', 'withdrawn');

    IF (v_completed + v_abandoned) > 0 THEN
      v_completion_rate := (v_completed::NUMERIC / (v_completed + v_abandoned)) * 100.0;
    ELSE
      v_completion_rate := 80; -- No history → optimistic default
    END IF;
  END;

  -- ── Response Rate (stored on user row) ────────────────────
  SELECT COALESCE(response_rate, 80)
  INTO v_response_rate
  FROM users
  WHERE id = p_user_id;

  -- ── Verified Bonus (additive, hard ceiling) ────────────────
  -- phone_verified: +5 pts, govt_id_verified: +15 pts
  DECLARE
    v_phone_verified BOOLEAN;
    v_id_verified    BOOLEAN;
  BEGIN
    SELECT
      is_verified,  -- phone verification flag
      false         -- govt ID verification (extend schema later)
    INTO v_phone_verified, v_id_verified
    FROM users
    WHERE id = p_user_id;

    IF v_phone_verified THEN v_verified_bonus := v_verified_bonus + 5; END IF;
    IF v_id_verified    THEN v_verified_bonus := v_verified_bonus + 15; END IF;
  END;

  -- ── Cancellation Penalty ──────────────────────────────────
  DECLARE v_cancellations INTEGER; BEGIN
    SELECT COUNT(*) INTO v_cancellations
    FROM applications
    WHERE applicant_id = p_user_id
      AND status IN ('cancelled', 'withdrawn');
    -- Each cancellation shaves 5 points (diminishing returns above 3)
    v_cancel_penalty := LEAST(v_cancellations * 5.0, 25.0);
  END;

  -- ── Report Penalty ────────────────────────────────────────
  DECLARE v_reports INTEGER; BEGIN
    SELECT COALESCE(reports, 0) INTO v_reports FROM users WHERE id = p_user_id;
    -- Each confirmed report = -10 points
    v_report_penalty := v_reports * 10.0;
  END;

  -- ── Composite Score ───────────────────────────────────────
  v_score :=
    (W_RATING   * v_weighted_rating)
    + (W_COMPLETE * v_completion_rate)
    + (W_RESPONSE * v_response_rate)
    + v_verified_bonus
    - v_cancel_penalty
    - v_report_penalty;

  RETURN GREATEST(0, LEAST(100, ROUND(v_score)));
END;
$$ LANGUAGE plpgsql STABLE;


-- ── 4. TRUST SCORE BADGE HELPER ──────────────────────────────
-- Returns the badge tier string: Bronze | Silver | Gold | Verified Gold
CREATE OR REPLACE FUNCTION get_trust_badge(p_score NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF    p_score >= 90 THEN RETURN 'Verified Gold';
  ELSIF p_score >= 70 THEN RETURN 'Gold';
  ELSIF p_score >= 40 THEN RETURN 'Silver';
  ELSE                     RETURN 'Bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ── 5. UPDATED get_nearby_jobs RPC ──────────────────────────
-- Fixes:
--  a) Returns distance_km (not distance_meters) — matches frontend expectations
--  b) Returns flat location_lat / location_lng columns
--  c) Filters on status = 'active' (canonical backend value)
--  d) Returns required_skills, geohash, full_address, location_name
DROP FUNCTION IF EXISTS get_nearby_jobs(double precision, double precision, double precision, integer, integer);

CREATE OR REPLACE FUNCTION get_nearby_jobs(
  user_lat       double precision,
  user_lng       double precision,
  radius_meters  double precision,
  limit_val      integer DEFAULT 20,
  offset_val     integer DEFAULT 0
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id',               j.id,
      'title',            j.title,
      'description',      j.description,
      'provider_id',      j.provider_id,
      'category_id',      j.category_id,
      'salary',           j.salary,
      'salary_type',      j.salary_type,
      'status',           j.status,
      'created_at',       j.created_at,
      -- Flat lat/lng — used directly by matchingEngine.ts
      'location_lat',     j.location_lat,
      'location_lng',     j.location_lng,
      -- Full address info
      'location_name',    j.location_name,
      'full_address',     j.full_address,
      'geohash',          j.geohash,
      -- Required skills for SkillMatchScore
      'required_skills',  COALESCE(j.required_skills, ARRAY[]::TEXT[]),
      -- Urgency
      'is_urgent',        COALESCE(j.is_urgent, false),
      -- Distance in km (not meters) — PostGIS returns meters, we divide
      'distance_km',      ROUND(
                            ST_Distance(
                              j.location,
                              ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
                            ) / 1000.0,
                            2
                          ),
      -- Provider info (joined)
      'provider', json_build_object(
        'name',            u.name,
        'profile_image',   u.profile_image,
        'trust_score',     COALESCE(u.trust_score, 50),
        'reports',         COALESCE(u.reports, 0),
        'is_verified',     COALESCE(u.is_verified, false)
      )
    )
    ORDER BY
      ST_Distance(
        j.location,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
      ) ASC,
      j.created_at DESC
  )
  INTO result
  FROM jobs j
  LEFT JOIN users u ON j.provider_id = u.id
  WHERE j.status = 'active'
    AND j.is_deleted = false
    AND j.location IS NOT NULL
    AND ST_DWithin(
      j.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  LIMIT limit_val
  OFFSET offset_val;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;


-- ── 6. NIGHTLY TRUST SCORE REFRESH ───────────────────────────
-- Optional: Call this in Supabase cron or via Edge Function
-- to keep trust_score column in sync with the calculated value.
-- Manually run once now to backfill existing users:
-- UPDATE users SET trust_score = calculate_trust_score(id);
