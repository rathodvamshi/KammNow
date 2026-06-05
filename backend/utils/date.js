/**
 * Centralized Date Utilities for Backend
 * Ensures we strictly handle and validate ISO dates before they reach PostgreSQL.
 */

/**
 * Parses an ISO date string and verifies it is a valid date.
 * @param {string} dateString - e.g. "2026-05-27T00:00:00.000Z"
 * @returns {Date|null} - A valid JS Date object or null if invalid
 */
const parseISODate = (dateString) => {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
};

/**
 * Ensures a date string is safe for PostgreSQL by converting it to a strict ISO string.
 * @param {string} dateString 
 * @returns {string|null} - ISO string or null
 */
const formatForDB = (dateString) => {
  const d = parseISODate(dateString);
  return d ? d.toISOString() : null;
};

module.exports = {
  parseISODate,
  formatForDB
};
