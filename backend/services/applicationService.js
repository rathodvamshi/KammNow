const applicationRepository = require('../repositories/applicationRepository');
const db = require('../db');

const createApplication = async (applicationData) => {
  return await applicationRepository.createApplication(applicationData);
};

const getReceivedApplications = async (providerId) => {
  return await applicationRepository.getReceivedApplications(providerId);
};

const updateApplicationStatus = async (applicationId, providerId, status) => {
  return await applicationRepository.updateApplicationStatus(applicationId, providerId, status);
};

const deleteApplication = async (applicationId, applicantId) => {
  return await applicationRepository.deleteApplication(applicationId, applicantId);
};

module.exports = {
  createApplication,
  getReceivedApplications,
  updateApplicationStatus,
  deleteApplication,
};
