const userService = require('../services/userService');
const { successResponse, errorResponse } = require('../utils/response');

const upsertProfile = async (req, res) => {
  try {
    const user = await userService.upsertProfile(req.user.uid, req.body);
    return successResponse(res, user, 200);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to update profile');
  }
};

const updateLocation = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const { lat, lon } = req.body;
    if (!lat || !lon) return errorResponse(res, 'Missing lat or lon', 400);

    const location = await userService.updateLocation(req.internalUserId, lat, lon);
    return successResponse(res, location);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Failed to update location');
  }
};

const getAddresses = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User profile not found', 404);
    const addresses = await userService.getAddresses(req.internalUserId);
    return successResponse(res, addresses);
  } catch (error) {
    console.log(error); // Also try console.log instead of error!
    return errorResponse(res, 'Failed to fetch addresses', 500, error);
  }
};

const updateHeartbeat = async (req, res) => {
  try {
    if (!req.internalUserId) return successResponse(res, { success: true });
    await userService.updateHeartbeat(req.internalUserId);
    return successResponse(res, { updated: true });
  } catch (error) {
    console.error(error);
    return successResponse(res, { success: false }); // Heartbeat should fail silently
  }
};

module.exports = {
  upsertProfile,
  updateLocation,
  getAddresses,
  updateHeartbeat,
};
