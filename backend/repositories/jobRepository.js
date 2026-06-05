const db = require('../db'); // we will use existing db.js

const createJob = async (jobData) => {
  const result = await db.query(`
    INSERT INTO jobs (
      provider_id, title, description,
      pay_amount, pay_type, category,
      location_lat, location_lng, geom,
      required_skills, location_name, full_address,
      is_urgent, status,
      quantity_total, gender_preference, contact_method,
      job_type, shift_start, shift_end, total_hours, same_day_payment,
      number_of_days, start_date,
      food_included, accommodation_included, overtime_available,
      joining_date, working_days_per_week,
      experience_required, salary_negotiable, pf_esi_included
    )
    VALUES (
      $1,  $2,  $3,
      $4,  $5,  $6,
      $7::float8, $8::float8,
      ST_SetSRID(ST_MakePoint($8::float8, $7::float8), 4326)::geometry,
      $9,  $10, $11,
      $12, 'active',
      $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21, $22,
      $23, $24, $25,
      $26, $27,
      $28, $29, $30
    )
    RETURNING *;
  `, [
    jobData.provider_id, jobData.title || '', jobData.description || '',
    jobData.salary ? parseFloat(jobData.salary) : null,
    jobData.salary_type || jobData.job_type || 'day',
    jobData.category_id || 'other',
    parseFloat(jobData.latitude), parseFloat(jobData.longitude),
    jobData.required_skills || [],
    jobData.location_name || jobData.full_address?.split(',')[0]?.trim() || 'Location',
    jobData.full_address || null,
    jobData.is_urgent || false,
    jobData.quantity_total || 1,
    jobData.gender_preference || 'any',
    jobData.contact_method || 'in_app_chat',
    jobData.job_type || 'day',
    jobData.shift_start || null,
    jobData.shift_end || null,
    jobData.total_hours ? parseFloat(jobData.total_hours) : null,
    jobData.same_day_payment || false,
    jobData.number_of_days ? parseInt(jobData.number_of_days) : null,
    jobData.start_date && !isNaN(Date.parse(jobData.start_date)) ? new Date(jobData.start_date).toISOString() : null,
    jobData.food_included || false,
    jobData.accommodation_included || false,
    jobData.overtime_available || false,
    jobData.joining_date && !isNaN(Date.parse(jobData.joining_date)) ? new Date(jobData.joining_date).toISOString() : null,
    jobData.working_days_per_week || '6 Days',
    jobData.experience_required || 'No Experience',
    jobData.salary_negotiable || false,
    jobData.pf_esi_included || false,
  ]);
  return result.rows[0];
};

const getProviderJobs = async (providerId, limit, offset) => {
  const result = await db.query(`
    SELECT * FROM jobs
    WHERE provider_id = $1 AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [providerId, limit, offset]);
  return result.rows;
};

const updateJobStatus = async (jobId, providerId, status) => {
  const result = await db.query(`
    UPDATE jobs SET status = $1, updated_at = NOW() 
    WHERE id = $2 AND provider_id = $3 AND is_deleted = false
    RETURNING *;
  `, [status, jobId, providerId]);
  return result.rows[0];
};

const deleteJob = async (jobId, providerId) => {
  const result = await db.query(`
    UPDATE jobs SET is_deleted = true, status = 'closed', updated_at = NOW() 
    WHERE id = $1 AND provider_id = $2
    RETURNING id;
  `, [jobId, providerId]);
  return result.rows[0];
};

const getFeedJobs = async (lat, lon, cursor, limit = 20, abGroup = 'A') => {
  let query = `
    SELECT j.*, 
      u.name as provider_name,
      u.profile_image as provider_avatar,
      u.rating_average as provider_trust_score
  `;
  let params = [];

  if (lat && lon) {
    query += `,
      (ST_Distance(j.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000) AS distance_km
    `;
    params = [lat, lon];
  } else {
    query += `, 0 as distance_km`;
  }

  query += `
    FROM jobs j
    JOIN users u ON j.provider_id = u.id
    WHERE j.status = 'active' AND u.is_deleted = FALSE
  `;

  if (cursor) {
    params.push(cursor);
    query += ` AND j.created_at < $${params.length}`;
  }

  if (lat && lon) {
    if (abGroup === 'B') {
      query += `
        ORDER BY 
          (COALESCE(u.rating_average, 5)*0.2 - ((ST_Distance(j.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000) * 10)) DESC,
          j.created_at DESC
        LIMIT ${limit};
      `;
    } else {
      query += `
        ORDER BY 
          (COALESCE(u.rating_average, 5) - ((ST_Distance(j.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000) * 2)) DESC,
          j.created_at DESC
        LIMIT ${limit};
      `;
    }
  } else {
    query += `
      ORDER BY j.created_at DESC LIMIT ${limit};
    `;
  }

  const result = await db.query(query, params);
  return result.rows.map(row => ({
    ...row,
    provider: {
      name: row.provider_name,
      profile_image: row.provider_avatar,
      trust_score: row.provider_trust_score
    }
  }));
};

module.exports = {
  createJob,
  getProviderJobs,
  updateJobStatus,
  deleteJob,
  getFeedJobs,
};
