const jobService = require('../services/jobService');
const { successResponse, errorResponse } = require('../utils/response');
const { redis } = require('../redis'); // for geogrid cache
const db = require('../db');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: find all seeker internal user IDs within `radiusKm` of a coordinate
// Uses PostGIS ST_DWithin on user_location table
// ─────────────────────────────────────────────────────────────────────────────
async function findNearbySeekersIds(lat, lon, radiusKm = 10) {
  try {
    const result = await db.query(`
      SELECT DISTINCT u.id
      FROM users u
      JOIN user_location ul ON ul.user_id = u.id
      WHERE
        u.is_deleted = false
        AND ST_DWithin(
          ul.geom::geography,
          ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
          $3 * 1000  -- convert km to metres
        )
    `, [lat, lon, radiusKm]);
    return result.rows.map(r => r.id);
  } catch (err) {
    // Non-critical — swallow errors so job creation still succeeds
    console.error('[Socket] findNearbySeekersIds error:', err.message);
    return [];
  }
}

// 1. Get Feed
const getFeed = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const cursor = req.query.cursor;

    // Cache Logic
    const filterKeys = Object.keys(req.query).filter(k => !['lat', 'lon', 'cursor'].includes(k)).sort();
    const filterStr = filterKeys.map(k => `${k}=${req.query[k]}`).join('&');
    const filtersHash = filterStr ? crypto.createHash('md5').update(filterStr).digest('hex').substring(0, 8) : 'all';

    let geohash = null;
    if (redis && lat && lon && !cursor) {
      geohash = `feed:geogrid:${lat.toFixed(1)}:${lon.toFixed(1)}:${filtersHash}`;
      const cachedFeed = await redis.get(geohash);
      if (cachedFeed) {
        return successResponse(res, JSON.parse(cachedFeed));
      }
    }

    const jobs = await jobService.getFeedJobs(lat, lon, cursor);

    if (redis && geohash && jobs.length > 0) {
      await redis.setex(geohash, 60, JSON.stringify(jobs));
    }

    return successResponse(res, jobs);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to fetch jobs feed');
  }
};

// 2. Get Provider Jobs
const getMyJobs = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const jobs = await jobService.getProviderJobs(req.internalUserId, limit, offset);
    return successResponse(res, jobs);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to fetch your jobs');
  }
};

// 3. Create Job
const createJob = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const jobData = { ...req.body, provider_id: req.internalUserId };
    const newJob = await jobService.createJob(jobData);

    // ── Realtime: notify nearby seekers ─────────────────────────────────────
    const socketManager = req.app.locals.socketManager;
    const lat = parseFloat(jobData.latitude);
    const lon = parseFloat(jobData.longitude);

    if (socketManager && lat && lon) {
      // Fire-and-forget: don't block HTTP response
      findNearbySeekersIds(lat, lon, 10).then(seekerIds => {
        const payload = { job: newJob, isNew: true };
        seekerIds.forEach(seekerId => {
          socketManager.emitToUser(seekerId, 'new_job', payload);
        });
        if (seekerIds.length > 0) {
          console.log(`[Socket] Emitted new_job to ${seekerIds.length} nearby seekers`);
        }
      }).catch(() => {}); // swallow — never block the response
    }
    // ────────────────────────────────────────────────────────────────────────

    return successResponse(res, newJob, 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to create job', 400);
  }
};

// 4. Update Status
const updateJobStatus = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const updatedJob = await jobService.updateJobStatus(req.params.id, req.internalUserId, req.body.status);
    return successResponse(res, updatedJob);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to update status');
  }
};

// 5. Delete Job
const deleteJob = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    await jobService.deleteJob(req.params.id, req.internalUserId);

    // ── Realtime: notify provider & all seekers who may have this job cached ─
    const socketManager = req.app.locals.socketManager;
    if (socketManager) {
      // Notify the provider's own devices (so other tabs/devices sync)
      socketManager.emitToUser(req.internalUserId, 'job_deleted', { jobId: req.params.id });
      // Broadcast job_deleted to all connected clients so their feed updates
      socketManager.broadcast('job_deleted', { jobId: req.params.id });
    }
    // ────────────────────────────────────────────────────────────────────────

    return successResponse(res, { deleted: true });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to delete job');
  }
};

module.exports = {
  getFeed,
  getMyJobs,
  createJob,
  updateJobStatus,
  deleteJob,
};
