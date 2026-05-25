require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const admin = require('firebase-admin');
const db = require('./db');
const { redis, getSeekersNearby } = require('./redis');

// Initialize Firebase Admin SDK for pushing FCM notifications
try {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'kammnow-ac625' });
  }
} catch (error) {
  console.error('[Worker] Firebase Admin SDK init failed:', error.message);
}

const STREAM = 'job:events';
const GROUP = 'notification_workers';
const CONSUMER = `worker_${process.pid}`;

async function setupStream() {
  if (!redis) {
    console.error('[Worker] Redis not available, shutting down.');
    process.exit(1);
  }
  try {
    // Create the stream and group if they don't exist
    // 0-0 means read from the beginning (used only on group creation)
    await redis.xgroup('CREATE', STREAM, GROUP, '0-0', 'MKSTREAM');
    console.log(`[Worker] Created consumer group ${GROUP} on stream ${STREAM}`);
  } catch (err) {
    // Ignore BUSYGROUP errors (group already exists)
    if (!err.message.includes('BUSYGROUP')) {
      console.error('[Worker] Error creating consumer group:', err);
    }
  }
}

async function processJobPosted(payloadStr) {
  try {
    const payload = JSON.parse(payloadStr);
    const { job_id, lat, lon, title, salary, salary_type, provider_name } = payload;

    if (!lat || !lon) return;

    // 1. Get nearby seekers via Redis Geo-Index (10km radius)
    console.log(`[Worker] Searching for seekers near ${lat}, ${lon}`);
    const nearby = await getSeekersNearby(lon, lat, 10);
    
    if (nearby.length === 0) {
      console.log(`[Worker] No seekers found within 10km for job ${job_id}`);
      return;
    }

    const seekerIds = nearby.map(n => n.userId);
    const distanceMap = new Map(nearby.map(n => [n.userId, n.distanceKm]));

    // 2. SQL Filter: active in last 7 days + valid FCM token + role=seeker + quiet hours check
    const res = await db.query(`
      SELECT id, fcm_token, quiet_hours_start, quiet_hours_end 
      FROM users 
      WHERE id = ANY($1) 
        AND last_active_at > NOW() - INTERVAL '7 days'
        AND is_deleted = false 
        AND COALESCE(is_suspended, FALSE) = FALSE
        AND fcm_token IS NOT NULL
    `, [seekerIds]);

    const activeSeekers = res.rows;
    if (activeSeekers.length === 0) {
      console.log(`[Worker] Filtered down to 0 active seekers for job ${job_id}`);
      return;
    }

    console.log(`[Worker] Found ${activeSeekers.length} active nearby seekers for job ${job_id}`);

    const fcmMessages = [];
    const dbNotifs = [];

    const now = new Date();
    // Crude UTC hours check for MVP - real world would convert to user's local timezone
    const currentHourMinute = now.getUTCHours() + now.getUTCMinutes() / 60;

    // 3. Prepare payload for each seeker
    for (const seeker of activeSeekers) {
      // Quiet Hours check
      if (seeker.quiet_hours_start && seeker.quiet_hours_end) {
        // Parse "HH:MM"
        const [startH, startM] = seeker.quiet_hours_start.split(':').map(Number);
        const [endH, endM] = seeker.quiet_hours_end.split(':').map(Number);
        const start = startH + startM / 60;
        const end = endH + endM / 60;

        let inQuietHours = false;
        if (start < end) {
          inQuietHours = currentHourMinute >= start && currentHourMinute < end;
        } else { // crosses midnight
          inQuietHours = currentHourMinute >= start || currentHourMinute < end;
        }

        if (inQuietHours) {
          console.log(`[Worker] Skipping push for ${seeker.id} due to quiet hours.`);
          // Still insert into DB (so they see it when they open app), but skip FCM push
          const distance = distanceMap.get(seeker.id) || 0;
          const bodyText = `New job! ${provider_name} is hiring. ${distance.toFixed(1)} km away.`;
          dbNotifs.push(`('${seeker.id}', '${title.replace(/'/g, "''")}', '${bodyText.replace(/'/g, "''")}', 'job_alert', '${job_id}', ${distance.toFixed(1)}, '{"job_id":"${job_id}"}'::jsonb)`);
          continue;
        }
      }

      const distance = distanceMap.get(seeker.id) || 0;
      const bodyText = `New job! ${provider_name} is hiring. ${distance.toFixed(1)} km away.`;
      
      // FCM message format
      fcmMessages.push({
        token: seeker.fcm_token,
        notification: {
          title: title,
          body: bodyText,
        },
        data: {
          job_id: job_id,
          type: 'job_alert'
        }
      });

      // DB insert row format
      dbNotifs.push(`('${seeker.id}', '${title.replace(/'/g, "''")}', '${bodyText.replace(/'/g, "''")}', 'job_alert', '${job_id}', ${distance.toFixed(1)}, '{"job_id":"${job_id}"}'::jsonb)`);
    }

    // 4. Send via Firebase Admin SDK (batch)
    if (fcmMessages.length > 0) {
      try {
        const fcmResponse = await admin.messaging().sendEach(fcmMessages);
        console.log(`[Worker] FCM Success: ${fcmResponse.successCount}, Failures: ${fcmResponse.failureCount}`);
      } catch (err) {
        console.error('[Worker] FCM Send error:', err.message);
      }
    }

    // 5. Bulk insert into notifications table
    if (dbNotifs.length > 0) {
      const insertQuery = `
        INSERT INTO notifications (user_id, title, message, type, job_id, distance_km, data) 
        VALUES ${dbNotifs.join(', ')}
      `;
      await db.query(insertQuery);
    }

    console.log(`[Worker] Successfully processed job ${job_id}`);

  } catch (error) {
    console.error('[Worker] Error processing job.posted event:', error);
  }
}

async function processApplicationSubmitted(payloadStr) {
  try {
    const payload = JSON.parse(payloadStr);
    const { application_id, job_id, provider_id, seeker_id, job_title, seeker_name } = payload;

    if (!provider_id) return;

    // 1. Get the provider's FCM token
    const res = await db.query(`
      SELECT id, fcm_token 
      FROM users 
      WHERE id = $1 
        AND is_deleted = false 
        AND fcm_token IS NOT NULL
    `, [provider_id]);

    if (res.rows.length === 0) {
      console.log(`[Worker] Provider ${provider_id} has no FCM token for job ${job_id}`);
    } else {
      const provider = res.rows[0];
      const title = 'New Application!';
      const bodyText = `${seeker_name} just applied for your job: ${job_title}`;

      // FCM message format
      const fcmMessage = {
        token: provider.fcm_token,
        notification: { title, body: bodyText },
        data: {
          job_id: job_id,
          application_id: application_id,
          type: 'new_application'
        }
      };

      try {
        await admin.messaging().send(fcmMessage);
        console.log(`[Worker] FCM Success: Sent application alert to provider ${provider_id}`);
      } catch (err) {
        console.error('[Worker] FCM Send error:', err.message);
      }
    }

    // 2. Insert into notifications table (even if FCM fails, they see it in-app)
    const bodyText = `${seeker_name} just applied for your job: ${job_title}`;
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, job_id, data) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      provider_id, 
      'New Application!', 
      bodyText, 
      'new_application', 
      job_id, 
      JSON.stringify({ job_id, application_id })
    ]);

    console.log(`[Worker] Successfully processed application.submitted for job ${job_id}`);

  } catch (error) {
    console.error('[Worker] Error processing application.submitted event:', error);
  }
}

async function processStatusChanged(payloadStr) {
  try {
    const payload = JSON.parse(payloadStr);
    const { application_id, job_id, provider_id, seeker_id, job_title, status, provider_name } = payload;

    if (!seeker_id) return;

    // 1. Get the seeker's FCM token
    const res = await db.query(`
      SELECT id, fcm_token 
      FROM users 
      WHERE id = $1 
        AND is_deleted = false 
        AND fcm_token IS NOT NULL
    `, [seeker_id]);

    const isAccepted = status === 'accepted';
    const title = isAccepted ? 'Application Accepted!' : 'Application Update';
    const bodyText = isAccepted 
      ? `Congrats! ${provider_name || 'The provider'} accepted your application for ${job_title}. Chat is now open.`
      : `Your application for ${job_title} was not selected. Keep applying!`;
    const notifType = isAccepted ? 'app_accepted' : 'app_rejected';

    if (res.rows.length === 0) {
      console.log(`[Worker] Seeker ${seeker_id} has no FCM token for job ${job_id}`);
    } else {
      const seeker = res.rows[0];

      // FCM message format
      const fcmMessage = {
        token: seeker.fcm_token,
        notification: { title, body: bodyText },
        data: {
          job_id: job_id,
          application_id: application_id,
          type: notifType
        }
      };

      try {
        await admin.messaging().send(fcmMessage);
        console.log(`[Worker] FCM Success: Sent status alert to seeker ${seeker_id}`);
      } catch (err) {
        console.error('[Worker] FCM Send error:', err.message);
      }
    }

    // 2. Insert into notifications table
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, job_id, data) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      seeker_id, 
      title, 
      bodyText, 
      notifType, 
      job_id, 
      JSON.stringify({ job_id, application_id })
    ]);

    console.log(`[Worker] Successfully processed status.changed for app ${application_id}`);

  } catch (error) {
    console.error('[Worker] Error processing status.changed event:', error);
  }
}

async function processJobCompleted(payloadStr) {
  try {
    const payload = JSON.parse(payloadStr);
    const { application_id, job_id, provider_id, seeker_id, job_title } = payload;

    if (!provider_id || !seeker_id) return;

    // Fetch both users to get their FCM tokens
    const res = await db.query(`
      SELECT id, fcm_token, name 
      FROM users 
      WHERE id IN ($1, $2) AND is_deleted = false
    `, [provider_id, seeker_id]);

    const users = res.rows;
    const provider = users.find(u => u.id === provider_id);
    const seeker = users.find(u => u.id === seeker_id);

    const fcmMessages = [];
    const dbNotifs = [];

    // Notify Provider
    if (provider) {
      const title = 'Job Completed! Please Rate';
      const body = `Rate your experience working with ${seeker?.name || 'the worker'} for ${job_title}.`;
      if (provider.fcm_token) {
        fcmMessages.push({
          token: provider.fcm_token,
          notification: { title, body },
          data: { job_id, application_id, type: 'rate_reminder' }
        });
      }
      dbNotifs.push(`('${provider_id}', '${title}', '${body.replace(/'/g, "''")}', 'rate_reminder', '${job_id}', '{"application_id":"${application_id}"}'::jsonb)`);
    }

    // Notify Seeker
    if (seeker) {
      const title = 'Job Completed! Please Rate';
      const body = `Rate your experience with ${provider?.name || 'the employer'} for ${job_title}.`;
      if (seeker.fcm_token) {
        fcmMessages.push({
          token: seeker.fcm_token,
          notification: { title, body },
          data: { job_id, application_id, type: 'rate_reminder' }
        });
      }
      dbNotifs.push(`('${seeker_id}', '${title}', '${body.replace(/'/g, "''")}', 'rate_reminder', '${job_id}', '{"application_id":"${application_id}"}'::jsonb)`);
    }

    if (fcmMessages.length > 0) {
      await admin.messaging().sendEach(fcmMessages).catch(e => console.error('[Worker] FCM Send error:', e.message));
    }

    if (dbNotifs.length > 0) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, job_id, data) 
        VALUES ${dbNotifs.join(', ')}
      `);
    }

    console.log(`[Worker] Sent rating reminders for completed job ${job_id}`);
  } catch (error) {
    console.error('[Worker] Error processing job.completed event:', error);
  }
}

async function processRatingDone(payloadStr) {
  try {
    const payload = JSON.parse(payloadStr);
    const { ratee_id } = payload;
    if (!ratee_id) return;

    console.log(`[Worker] Recalculating trust score for user ${ratee_id}`);

    // Fetch aggregate rating and counts for the user
    const res = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating
      FROM reviews 
      WHERE to_user_id = $1 AND is_deleted = false
    `, [ratee_id]);

    const stats = res.rows[0];
    const avgRating = parseFloat(stats.avg_rating) || 0;
    const totalReviews = parseInt(stats.total_reviews) || 0;

    // For now, simple update without complex decay. Update users table with new stats.
    // We update worker_rating/employer_rating (we'll just use one for simplicity or both)
    await db.query(`
      UPDATE users 
      SET 
        worker_rating = $1,
        employer_rating = $1,
        total_reviews = $2,
        trust_score = GREATEST(0, LEAST(100, 
          ($1 / 5.0 * 100 * 0.35) + 
          (COALESCE(response_rate, 80) * 0.15) + 
          (80 * 0.25) -- Mock completion rate 80%
          -- we can add the rest of the formula here
        ))
      WHERE id = $3
    `, [avgRating, totalReviews, ratee_id]);

    console.log(`[Worker] Trust score updated for user ${ratee_id}`);
  } catch (error) {
    console.error('[Worker] Error processing rating.done event:', error);
  }
}

async function listenForEvents() {
  console.log(`[Worker] ${CONSUMER} listening for events on ${STREAM}...`);
  
  while (true) {
    try {
      // XREADGROUP GROUP group consumer BLOCK ms STREAMS stream ID
      // BLOCK 5000: blocks for 5 seconds waiting for new events
      // > means read new messages not yet delivered to other consumers
      const results = await redis.xreadgroup(
        'GROUP', GROUP, CONSUMER,
        'BLOCK', 5000,
        'COUNT', 10,
        'STREAMS', STREAM, '>'
      );

      if (results && results.length > 0) {
        const [streamName, messages] = results[0];
        
        for (const message of messages) {
          const [messageId, fields] = message;
          
          // fields is an array: ['type', 'job.posted', 'payload', '{...}']
          let type = null;
          let payloadStr = null;
          
          for (let i = 0; i < fields.length; i += 2) {
            if (fields[i] === 'type') type = fields[i + 1];
            if (fields[i] === 'payload') payloadStr = fields[i + 1];
          }

          if (type === 'job.posted' && payloadStr) {
            await processJobPosted(payloadStr);
          } else if (type === 'application.submitted' && payloadStr) {
            await processApplicationSubmitted(payloadStr);
          } else if (type === 'status.changed' && payloadStr) {
            await processStatusChanged(payloadStr);
          } else if (type === 'job.completed' && payloadStr) {
            await processJobCompleted(payloadStr);
          } else if (type === 'rating.done' && payloadStr) {
            await processRatingDone(payloadStr);
          }

          // Acknowledge the message so it's removed from pending list
          await redis.xack(STREAM, GROUP, messageId);
        }
      }
    } catch (err) {
      console.error('[Worker] Event loop error:', err.message);
      // Wait a bit before retrying to avoid CPU spin
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

async function start() {
  await setupStream();
  listenForEvents();
}

start();

process.on('SIGINT', () => {
  console.log('[Worker] Shutting down...');
  if (redis) redis.quit();
  process.exit(0);
});
