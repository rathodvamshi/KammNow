const db = require('../db');

const createApplication = async (applicationData) => {
  const result = await db.query(`
    INSERT INTO job_applications (
      job_id, applicant_id, cover_letter, proposed_rate, status
    )
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *;
  `, [
    applicationData.job_id,
    applicationData.applicant_id,
    applicationData.cover_letter || '',
    applicationData.proposed_rate ? parseFloat(applicationData.proposed_rate) : null
  ]);
  return result.rows[0];
};

const getReceivedApplications = async (providerId) => {
  const result = await db.query(`
    SELECT a.*,
      j.title as job_title,
      u.id as applicant_id,
      u.name as applicant_name,
      u.profile_image as applicant_avatar,
      u.rating_average as applicant_rating
    FROM job_applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN users u ON a.applicant_id = u.id
    WHERE j.provider_id = $1
    ORDER BY a.created_at DESC
  `, [providerId]);
  return result.rows;
};

const updateApplicationStatus = async (applicationId, providerId, status) => {
  const result = await db.query(`
    UPDATE job_applications a
    SET status = $1, updated_at = NOW()
    FROM jobs j
    WHERE a.job_id = j.id 
      AND a.id = $2 
      AND j.provider_id = $3
    RETURNING a.*;
  `, [status, applicationId, providerId]);
  return result.rows[0];
};

const deleteApplication = async (applicationId, applicantId) => {
  const result = await db.query(`
    DELETE FROM job_applications
    WHERE id = $1 AND applicant_id = $2
    RETURNING id;
  `, [applicationId, applicantId]);
  return result.rows[0];
};

module.exports = {
  createApplication,
  getReceivedApplications,
  updateApplicationStatus,
  deleteApplication,
};
