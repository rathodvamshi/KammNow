const userRepository = require('../repositories/userRepository');

const upsertProfile = async (firebaseUid, profileData) => {
  return await userRepository.upsertProfile(firebaseUid, profileData);
};

const updateLocation = async (userId, lat, lon) => {
  return await userRepository.updateLocation(userId, lat, lon);
};

const getAddresses = async (userId) => {
  return await userRepository.getAddresses(userId);
};

const updateHeartbeat = async (userId) => {
  return await userRepository.updateHeartbeat(userId);
};

module.exports = {
  upsertProfile,
  updateLocation,
  getAddresses,
  updateHeartbeat,
};
