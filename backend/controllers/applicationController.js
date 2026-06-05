const applicationService = require('../services/applicationService');
const { successResponse, errorResponse } = require('../utils/response');
const db = require('../db');

// Helper: look up the provider_id for a given job
async function getJobProviderId(jobId) {
  try {
    const result = await db.query('SELECT provider_id FROM jobs WHERE id = $1', [jobId]);
    return result.rows[0]?.provider_id || null;
  } catch {
    return null;
  }
}

// Helper: look up full job applicant count
async function getApplicantCount(jobId) {
  try {
    const result = await db.query(
      "SELECT COUNT(*) AS cnt FROM job_applications WHERE job_id = $1 AND is_deleted = false",
      [jobId]
    );
    return parseInt(result.rows[0]?.cnt || 0);
  } catch {
    return 0;
  }
}

const createApplication = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const applicationData = { ...req.body, applicant_id: req.internalUserId };
    const newApplication = await applicationService.createApplication(applicationData);

    // ── Realtime: notify the job provider ───────────────────────────────────
    const socketManager = req.app.locals.socketManager;
    if (socketManager && newApplication?.job_id) {
      // Fire-and-forget
      Promise.all([
        getJobProviderId(newApplication.job_id),
        getApplicantCount(newApplication.job_id),
      ]).then(([providerId, applicantCount]) => {
        if (!providerId) return;
        socketManager.emitToUser(providerId, 'job_application_received', {
          jobId: newApplication.job_id,
          applicantCount,
          application: newApplication,
        });
        console.log(`[Socket] Emitted job_application_received to provider ${providerId}`);
      }).catch(() => {});
    }
    // ────────────────────────────────────────────────────────────────────────

    return successResponse(res, newApplication, 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to create application', 400);
  }
};

const getReceivedApplications = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const applications = await applicationService.getReceivedApplications(req.internalUserId);

    // Formatting for frontend
    const formatted = applications.map(app => ({
      ...app,
      applicant: {
        id: app.applicant_id,
        name: app.applicant_name,
        profile_image: app.applicant_avatar,
        worker_rating: app.applicant_rating
      }
    }));
    return successResponse(res, formatted);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to fetch received applications', 500, error);
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const updatedApplication = await applicationService.updateApplicationStatus(req.params.id, req.internalUserId, req.body.status);
    if (!updatedApplication) {
      return errorResponse(res, 'Application not found or unauthorized', 404);
    }

    // ── Realtime: notify the applicant of status update ──────────────────────
    const socketManager = req.app.locals.socketManager;
    if (socketManager && updatedApplication?.applicant_id) {
      socketManager.emitToUser(updatedApplication.applicant_id, 'application_status_updated', {
        applicationId: updatedApplication.id,
        jobId: updatedApplication.job_id,
        status: updatedApplication.status,
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    return successResponse(res, updatedApplication);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to update application status');
  }
};

const deleteApplication = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    await applicationService.deleteApplication(req.params.id, req.internalUserId);
    return successResponse(res, { deleted: true });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to delete application');
  }
};

module.exports = {
  createApplication,
  getReceivedApplications,
  updateApplicationStatus,
  deleteApplication,
};
