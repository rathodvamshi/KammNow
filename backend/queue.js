const { Queue } = require('bullmq');
const { redis } = require('./redis'); // Reusing existing ioredis instance

// Initialize queues
const notificationQueue = new Queue('notifications', { connection: redis });
const dataCleanupQueue = new Queue('dataCleanup', { connection: redis });

const enqueueNotification = async (type, data) => {
  return await notificationQueue.add(type, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

module.exports = {
  notificationQueue,
  dataCleanupQueue,
  enqueueNotification,
};
