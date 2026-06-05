/**
 * haversine.js — Server-side Haversine distance calculation.
 *
 * Mirrors the frontend src/utils/helpers.ts implementation exactly
 * so distance values are consistent across app and backend.
 *
 * Returns distance in kilometres.
 *
 * Uses WGS-84 mean Earth radius: 6371 km
 * Accuracy: ~0.5% for distances up to 1000 km (more than sufficient for job radius matching)
 */

const EARTH_RADIUS_KM = 6371;

/**
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in km, or Infinity for invalid inputs
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  if (
    !isFinite(lat1) || !isFinite(lng1) ||
    !isFinite(lat2) || !isFinite(lng2) ||
    lat1 < -90  || lat1 > 90  || lat2 < -90  || lat2 > 90 ||
    lng1 < -180 || lng1 > 180 || lng2 < -180 || lng2 > 180
  ) {
    return Infinity;
  }
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * @param {number} deg
 * @returns {number}
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Returns true if a point (lat2, lng2) is within radiusKm of (lat1, lng1).
 * Cheaper than computing exact distance when you only need a boolean.
 */
function isWithinRadius(lat1, lng1, lat2, lng2, radiusKm) {
  return haversineDistance(lat1, lng1, lat2, lng2) <= radiusKm;
}

module.exports = { haversineDistance, isWithinRadius };
