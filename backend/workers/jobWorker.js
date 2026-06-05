const { Worker } = require('bullmq');
const { redis } = require('../redis');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'kammnow-ac625',
  });
}

console.log('🚀 Background Worker starting...');

const notificationWorker = new Worker('notifications', async job => {
  console.log(`Processing job ${job.id} of type ${job.name}...`);
  
  const data = job.data;
  
  if (job.name === 'job.posted') {
    // Simulated processing for job notifications
    console.log(`Processing new job notification for job_id: ${data.job_id}`);
    
    // Example: fetch nearby seekers and send FCM push (mocked)
    // await db.query('SELECT device_token FROM users WHERE ...')
    // admin.messaging().sendMulticast(...)
    
    return { success: true, deliveredCount: 5 };
  }
  
  return { success: true };
}, { connection: redis });

notificationWorker.on('completed', job => {
  console.log(`✅ Job ${job.id} completed! Result:`, job.returnvalue);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});
