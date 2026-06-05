const userService = require('../services/userService');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/users/profile
 * Creates or updates a user profile.
 * Uses req.user.uid (Firebase UID) as the lookup key — consistent with
 * how the DB stores users (firebase_uid is the unique identity anchor).
 * Also works for brand-new users before an internalUserId exists.
 */
const upsertProfile = async (req, res) => {
  try {
    // Map `age` → `experience` so DB schema stays consistent
    const payload = { ...req.body };
    if (payload.age !== undefined && payload.experience === undefined) {
      payload.experience = payload.age;
    }

    const user = await userService.upsertProfile(req.user.uid, payload);
    return successResponse(res, { success: true, user }, 200);
  } catch (error) {
    console.error('[UserController] upsertProfile error:', error.message);
    return errorResponse(res, 'Failed to update profile');
  }
};

/**
 * POST /api/users/location
 */
const updateLocation = async (req, res) => {
  try {
    if (!req.internalUserId) {
      return errorResponse(res, 'User profile not found. Please complete registration first.', 404);
    }
    const { lat, lon } = req.body;
    if (lat === undefined || lon === undefined) {
      return errorResponse(res, 'Missing lat or lon', 400);
    }

    const location = await userService.updateLocation(req.internalUserId, lat, lon);
    return successResponse(res, location);
  } catch (error) {
    console.error('[UserController] updateLocation error:', error.message);
    return errorResponse(res, 'Failed to update location');
  }
};

/**
 * GET /api/users/addresses
 */
const getAddresses = async (req, res) => {
  try {
    if (!req.internalUserId) {
      return errorResponse(res, 'User profile not found', 404);
    }
    const addresses = await userService.getAddresses(req.internalUserId);
    return successResponse(res, addresses);
  } catch (error) {
    console.error('[UserController] getAddresses error:', error.message);
    return errorResponse(res, 'Failed to fetch addresses', 500);
  }
};

/**
 * POST /api/users/heartbeat
 * Fails silently — never block the app for a heartbeat failure.
 */
const updateHeartbeat = async (req, res) => {
  try {
    if (req.internalUserId) {
      await userService.updateHeartbeat(req.internalUserId);
    }
    return successResponse(res, { updated: !!req.internalUserId });
  } catch (error) {
    console.error('[UserController] updateHeartbeat error:', error.message);
    // Intentionally return success — heartbeat must never crash the app
    return successResponse(res, { updated: false });
  }
};

module.exports = {
  upsertProfile,
  updateLocation,
  getAddresses,
  updateHeartbeat,
};
