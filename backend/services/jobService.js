const jobRepository = require('../repositories/jobRepository');
const { enqueueNotification } = require('../queue');

const createJob = async (jobData) => {
  const newJob = await jobRepository.createJob(jobData);
  if (newJob) {
    // Queue background notification task
    await enqueueNotification('job.posted', {
      job_id: newJob.id,
      lat: parseFloat(jobData.latitude),
      lon: parseFloat(jobData.longitude),
      title: jobData.title,
      salary: jobData.salary,
      salary_type: jobData.salary_type || jobData.job_type,
    });
  }
  return newJob;
};

const getProviderJobs = async (providerId, limit, offset) => {
  return await jobRepository.getProviderJobs(providerId, limit, offset);
};

const updateJobStatus = async (jobId, providerId, status) => {
  return await jobRepository.updateJobStatus(jobId, providerId, status);
};

const deleteJob = async (jobId, providerId) => {
  return await jobRepository.deleteJob(jobId, providerId);
};

const getFeedJobs = async (lat, lon, cursor) => {
  return await jobRepository.getFeedJobs(lat, lon, cursor);
};

module.exports = {
  createJob,
  getProviderJobs,
  updateJobStatus,
  deleteJob,
  getFeedJobs,
};
