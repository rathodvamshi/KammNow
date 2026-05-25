require('dotenv').config({ path: '../.env' }); // Load root .env
require('dotenv').config(); // Load backend .env (if it exists)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const admin = require('firebase-admin');
const db = require('./db');
const { redis, addSeekerLocation } = require('./redis');
const { publishEvent } = require('./eventBus');
const { rateLimiter } = require('./rateLimiter');

// 1. Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: 'kammnow-ac625',
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
}

const app = express();

// 2. Security Middleware
app.use(helmet()); 
app.use(cors()); 
app.use(express.json()); 

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// 4. Authentication Middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth] Missing or invalid auth header:', authHeader);
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split('Bearer ')[1];
    if (token === 'null') {
      console.error('[Auth] Token is literally the string "null"');
      return res.status(401).json({ error: 'Unauthorized: Token is null' });
    }
    
    // Verify Firebase JWT using Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; 
    
    // Inject internal UUID if the user exists
    const userRes = await db.query('SELECT id FROM users WHERE firebase_uid = $1 AND is_deleted = false', [decodedToken.uid]);
    if (userRes.rows.length > 0) {
      req.internalUserId = userRes.rows[0].id;
    }
    
    next();
  } catch (error) {
    console.error('[Auth] Error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// 5. API Routes
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Backend running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});


const profileSchema = z.object({
  phone: z.string().min(10).max(15),
  role: z.enum(['seeker', 'provider']).default('seeker'),
  name: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  gender: z.string().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.number().min(0).optional()
});

// ==========================================
// USER PROFILES
// ==========================================
app.post('/api/users/profile', authenticateUser, async (req, res) => {
  try {
    
    const validatedData = profileSchema.parse(req.body);
    const { phone, role, name, bio, gender, languages, skills, experience } = validatedData;

    const firebase_uid = req.user.uid;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    // Upsert User Profile using raw PG for high performance
    const upsertQuery = `
      INSERT INTO users (firebase_uid, phone, role, name, bio, gender, languages, skills, experience)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (firebase_uid) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        name = COALESCE(EXCLUDED.name, users.name),
        bio = COALESCE(EXCLUDED.bio, users.bio),
        gender = COALESCE(EXCLUDED.gender, users.gender),
        languages = COALESCE(EXCLUDED.languages, users.languages),
        skills = COALESCE(EXCLUDED.skills, users.skills),
        experience = COALESCE(EXCLUDED.experience, users.experience),
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await db.query(upsertQuery, [
      firebase_uid, phone, role, name, bio, gender, languages || [], skills || [], experience || 0
    ]);

    res.status(201).json({ success: true, message: 'User profile saved', user: result.rows[0] });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    console.error('Profile creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper for Teleportation Fraud Check
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

app.post('/api/users/location', authenticateUser, async (req, res) => {
  try {
    const { latitude, longitude, address, city, state, country, pincode } = req.body;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    const upsertLocation = `
      INSERT INTO user_location (user_id, latitude, longitude, address, city, state, country, pincode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) -- We don't have a unique constraint on user_id yet, wait, we should just insert or delete old.
      -- Actually, easier to just delete old location and insert new, or find existing.
    `;
    
    // Check if location exists
    const existing = await db.query('SELECT id, latitude, longitude FROM user_location WHERE user_id = $1 AND is_deleted = false', [req.internalUserId]);
    
    let result;
    if (existing.rows.length > 0) {
      const oldLoc = existing.rows[0];
      const distance = getDistanceKm(oldLoc.latitude, oldLoc.longitude, latitude, longitude);
      if (distance !== null && distance > 10000) {
        return res.status(400).json({ success: false, error: 'Teleportation fraud detected. Location update rejected.' });
      }

      result = await db.query(`
        UPDATE user_location 
        SET latitude = $1, longitude = $2, address = $3, city = $4, state = $5, country = $6, pincode = $7, updated_at = NOW()
        WHERE id = $8 RETURNING *
      `, [latitude, longitude, address, city, state, country, pincode, existing.rows[0].id]);
    } else {
      result = await db.query(`
        INSERT INTO user_location (user_id, latitude, longitude, address, city, state, country, pincode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [req.internalUserId, latitude, longitude, address, city, state, country, pincode]);
    }

    res.status(200).json({ success: true, location: result.rows[0] });
  } catch (error) {
    console.error('Location error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Presence & FCM heartbeat
app.post('/api/users/heartbeat', authenticateUser, async (req, res) => {
  try {
    const { latitude, longitude, fcm_token } = req.body;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    // Update SQL timestamps and optional fcm_token
    let query = 'UPDATE users SET last_active_at = NOW()';
    let params = [req.internalUserId];
    
    if (fcm_token) {
      query += ', fcm_token = $2';
      params.push(fcm_token);
    }
    
    query += ' WHERE id = $1';
    await db.query(query, params);

    // Update Redis Geo-Index if coords provided
    if (latitude && longitude) {
      // Teleportation check for heartbeat
      const existing = await db.query('SELECT latitude, longitude FROM user_location WHERE user_id = $1 AND is_deleted = false', [req.internalUserId]);
      if (existing.rows.length > 0) {
        const oldLoc = existing.rows[0];
        const distance = getDistanceKm(oldLoc.latitude, oldLoc.longitude, latitude, longitude);
        if (distance !== null && distance > 10000) {
          return res.status(400).json({ success: false, error: 'Teleportation fraud detected.' });
        }
      }

      // Background promise, don't await blocking the response
      addSeekerLocation(req.internalUserId, parseFloat(longitude), parseFloat(latitude)).catch(console.error);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// JOBS
// ==========================================
// Rate limit: 10 job posts per day
const postJobLimiter = rateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  keyPrefix: 'rl:postjob:'
});

app.post('/api/jobs', authenticateUser, postJobLimiter, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    
    const {
      title,
      description,
      salary,
      salary_type,
      job_type,
      experience_required,
      category_id,
      latitude,
      longitude,
      required_skills,
      full_address,
      location_name,
      is_urgent,
    } = req.body;

    // Validate required geo fields
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Job location (latitude/longitude) is required' });
    }

    // 1. Insert the Job — writes BOTH flat columns AND the PostGIS geography column.
    //    The geography column is required for ST_DWithin geo-queries (get_nearby_jobs RPC).
    const result = await db.query(`
      INSERT INTO jobs (
        provider_id, title, description,
        salary, salary_type, job_type,
        experience_required, category_id,
        location_lat, location_lng,
        location,
        required_skills,
        full_address, location_name,
        is_urgent,
        status
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6,
        $7, $8,
        $9, $10,
        ST_SetSRID(ST_MakePoint($10, $9), 4326)::geography,
        $11,
        $12, $13,
        $14,
        'active'
      )
      RETURNING *;
    `, [
      req.internalUserId, title, description,
      salary, salary_type, job_type,
      experience_required || null, category_id || null,
      parseFloat(latitude), parseFloat(longitude),
      required_skills || [],
      full_address || null, location_name || null,
      is_urgent || false,
    ]);

    const newJob = result.rows[0];

    // 2. Publish Job Posted event to Redis Streams for background notification worker
    publishEvent('job:events', 'job.posted', {
      job_id: newJob.id,
      lat: parseFloat(latitude),
      lon: parseFloat(longitude),
      title: title,
      salary: salary,
      salary_type: salary_type,
      provider_name: req.user.name || 'A provider' // Ideally fetched from DB, simplified here
    });

    res.status(201).json({ success: true, job: newJob });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// FEED & MATCHING
// ==========================================

// Helper function to calculate distance using Haversine
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

app.get('/api/jobs/feed', authenticateUser, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const cursor = req.query.cursor; // ISO timestamp string
    
    // 1. Check Redis Cache for popular cities (Only if no cursor, as we don't cache paginated results yet)
    if (redis && lat && lon && !cursor) {
      const TOP_CITIES = [
        { name: 'mumbai', lat: 19.0760, lon: 72.8777 },
        { name: 'delhi', lat: 28.7041, lon: 77.1025 },
        { name: 'bangalore', lat: 12.9716, lon: 77.5946 }
      ];
      
      for (const city of TOP_CITIES) {
        if (getDistance(lat, lon, city.lat, city.lon) < 25) {
          const cachedFeed = await redis.get(`feed:cache:${city.name}`);
          if (cachedFeed) {
            console.log(`[Feed] Cache HIT for ${city.name} - serving in <50ms`);
            return res.json({ success: true, jobs: JSON.parse(cachedFeed), source: 'cache' });
          }
        }
      }
    }

    console.log('[Feed] Cache MISS or rural area - running live DB query');

    let query = `
      SELECT 
        j.*, 
        u.name as provider_name, 
        u.avatar_url as provider_avatar,
        u.trust_score as provider_trust_score,
        u.ab_group as provider_ab_group
    `;
    let params = [];

    // Note: To properly test A/B logic, we check the SEEKER's ab_group (from req.user if available).
    // For this implementation, we will fetch the seeker's ab_group first.
    let seekerAbGroup = 'A';
    if (req.internalUserId) {
      const seekerRes = await db.query('SELECT ab_group FROM users WHERE id = $1', [req.internalUserId]);
      if (seekerRes.rows.length > 0) {
        seekerAbGroup = seekerRes.rows[0].ab_group || 'A';
      }
    }

    if (lat && lon) {
      query += `,
        (6371 * acos(cos(radians($1)) * cos(radians(j.location_lat)) * cos(radians(j.location_lng) - radians($2)) + sin(radians($1)) * sin(radians(j.location_lat)))) AS distance_km
      `;
      params = [lat, lon];
    } else {
      query += `, 0 as distance_km`;
    }

    query += `
      FROM jobs j
      JOIN users u ON j.provider_id = u.id
      WHERE j.status = 'active'
    `;

    // Filter out deleted providers
    query += ` AND u.is_deleted = FALSE`;

    if (cursor) {
      params.push(cursor);
      query += ` AND j.created_at < $${params.length}`;
    }

    if (lat && lon) {
      if (seekerAbGroup === 'B') {
        // Variant B: Hyper-local aggressive distance penalty (Ignore trust score mostly)
        query += `
          ORDER BY 
            (COALESCE(u.trust_score, 50)*0.2 - ((6371 * acos(cos(radians($1)) * cos(radians(j.location_lat)) * cos(radians(j.location_lng) - radians($2)) + sin(radians($1)) * sin(radians(j.location_lat)))) * 10)) DESC,
            j.created_at DESC
          LIMIT 20;
        `;
      } else {
        // Variant A (Control): Standard balanced Trust Score - Distance Penalty
        query += `
          ORDER BY 
            (COALESCE(u.trust_score, 50) - ((6371 * acos(cos(radians($1)) * cos(radians(j.location_lat)) * cos(radians(j.location_lng) - radians($2)) + sin(radians($1)) * sin(radians(j.location_lat)))) * 2)) DESC,
            j.created_at DESC
          LIMIT 20;
        `;
      }
    } else {
      query += `
        ORDER BY j.created_at DESC LIMIT 20;
      `;
    }

    const result = await db.query(query, params);
    
    const jobs = result.rows.map(row => ({
      ...row,
      provider: {
        name: row.provider_name,
        profile_image: row.provider_avatar,
        trust_score: row.provider_trust_score
      }
    }));

    res.json({ success: true, jobs, source: 'live' });
  } catch (error) {
    console.error('[Feed Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ADMIN DASHBOARD
// ==========================================
app.get('/api/admin/stats', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    
    // Check if the requesting user is an admin
    const userRes = await db.query('SELECT role FROM users WHERE id = $1', [req.internalUserId]);
    if (userRes.rows.length === 0 || userRes.rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden. Admin access required.' });
    }

    // Run aggregations concurrently
    const [usersResult, jobsResult, appsResult, trustResult] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'seeker' THEN 1 ELSE 0 END) as total_seekers,
          SUM(CASE WHEN role = 'provider' THEN 1 ELSE 0 END) as total_providers,
          SUM(CASE WHEN last_active_at > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) as daily_active_users
        FROM users
        WHERE is_deleted = false
      `),
      db.query(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_jobs,
          SUM(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) as daily_new_jobs
        FROM jobs
        WHERE is_deleted = false
      `),
      db.query(`
        SELECT 
          COUNT(*) as total_applications,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END)::float / GREATEST(COUNT(*), 1) as overall_acceptance_rate,
          COUNT(*) / GREATEST((SELECT COUNT(*) FROM jobs WHERE is_deleted = false), 1) as avg_apps_per_job
        FROM job_applications
      `),
      db.query(`
        SELECT AVG(trust_score) as avg_trust_score FROM users WHERE role = 'provider' AND is_deleted = false
      `)
    ]);

    res.json({
      success: true,
      data: {
        users: usersResult.rows[0],
        jobs: jobsResult.rows[0],
        applications: appsResult.rows[0],
        trust: trustResult.rows[0]
      }
    });

  } catch (error) {
    console.error('[Admin Stats Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/jobs/:id/status', authenticateUser, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    const result = await db.query(`
      UPDATE jobs SET status = $1, updated_at = NOW() 
      WHERE id = $2 AND provider_id = $3 AND is_deleted = false
      RETURNING *;
    `, [status, id, req.internalUserId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized or Job Not Found' });
    }

    res.status(200).json({ success: true, job: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/jobs/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    // Soft delete the job
    const result = await db.query(`
      UPDATE jobs SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND provider_id = $2
      RETURNING id;
    `, [id, req.internalUserId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized or Job Not Found' });
    }

    res.status(200).json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// APPLICATIONS
// ==========================================
app.post('/api/applications', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    const { job_id, message } = req.body;

    // Insert ignoring duplicate constraint via DO NOTHING or return error
    const result = await db.query(`
      INSERT INTO job_applications (job_id, seeker_id, message)
      VALUES ($1, $2, $3)
      ON CONFLICT (job_id, seeker_id) DO NOTHING
      RETURNING *;
    `, [job_id, req.internalUserId, message || null]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'You have already applied for this job.' });
    }
    
    // Increment applicants_count and get provider_id
    const jobRes = await db.query('UPDATE jobs SET applicants_count = applicants_count + 1 WHERE id = $1 RETURNING provider_id, title', [job_id]);
    
    if (jobRes.rows.length > 0) {
      const job = jobRes.rows[0];
      
      // Publish event for background worker to send Push Notification
      publishEvent('job:events', 'application.submitted', {
        application_id: result.rows[0].id,
        job_id: job_id,
        provider_id: job.provider_id,
        seeker_id: req.internalUserId,
        job_title: job.title,
        seeker_name: req.user.name || 'A seeker'
      });
    }

    res.status(201).json({ success: true, application: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Secure endpoint for providers to fetch their received applications
// Hides exact GPS coordinates of seekers for privacy
app.get('/api/applications/received', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    // Join applications with jobs and seekers (users + user_location)
    // Only return the seeker's city/state, not exact lat/lng
    let query = `
      SELECT 
        a.id, a.status, a.message as description, a.created_at as applied_at, a.seeker_id as applicant_id, a.job_id,
        j.title as job_title, j.category as job_category, j.location_lat as job_lat, j.location_lng as job_lng,
        u.name, u.profile_image as avatar_url, u.rating_average as worker_rating, u.rating_count as jobs_completed, u.skills,
        ul.city, ul.state, ul.latitude as seeker_lat, ul.longitude as seeker_lng
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.seeker_id = u.id
      LEFT JOIN user_location ul ON u.id = ul.user_id AND ul.is_deleted = false
      WHERE j.provider_id = $1 AND a.is_deleted = false
    `;
    let params = [req.internalUserId];

    if (req.query.cursor) {
      params.push(req.query.cursor);
      query += ` AND a.created_at < $${params.length}`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT 20`;
    const result = await db.query(query, params);

    const applications = result.rows.map(row => {
      // Calculate distance if both coords exist
      let distanceKm = undefined;
      if (row.job_lat && row.job_lng && row.seeker_lat && row.seeker_lng) {
        // Haversine
        const R = 6371;
        const dLat = (row.seeker_lat - row.job_lat) * Math.PI / 180;
        const dLon = (row.seeker_lng - row.job_lng) * Math.PI / 180;
        const lat1 = row.job_lat * Math.PI / 180;
        const lat2 = row.seeker_lat * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceKm = R * c;
      }

      return {
        id: row.id,
        status: row.status,
        description: row.description,
        applied_at: row.applied_at,
        applicant_id: row.applicant_id,
        job_id: row.job_id,
        distance_km: distanceKm,
        job: {
          id: row.job_id,
          title: row.job_title,
          category: row.job_category
        },
        applicant: {
          id: row.applicant_id,
          name: row.name,
          avatar_url: row.avatar_url,
          worker_rating: row.worker_rating,
          jobs_completed: row.jobs_completed,
          skills: row.skills,
          location_name: row.city ? `${row.city}${row.state ? ', ' + row.state : ''}` : 'Nearby'
        }
      };
    });

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/applications/:id/status', authenticateUser, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    // Only the provider of the job can change status (or the seeker withdrawing)
    // Complex validation: let's just do a basic one for now
    const appRes = await db.query(`
      SELECT a.seeker_id, a.job_id, j.provider_id, j.title 
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `, [id]);
    
    if (appRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Application not found' });
    
    const application = appRes.rows[0];
    const isProvider = application.provider_id === req.internalUserId;
    const isSeeker = application.seeker_id === req.internalUserId;

    if (!isProvider && !isSeeker) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const result = await db.query(`
      UPDATE job_applications SET status = $1, updated_at = NOW() 
      WHERE id = $2 RETURNING *;
    `, [status, id]);

    // If application is accepted, automatically generate a Chat Room and notify the seeker
    if (status === 'accepted') {
      const roomId = `chat:application:${id}`;
      await db.query(`
        INSERT INTO chat_rooms (id, application_id, job_id, provider_id, seeker_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (application_id) DO NOTHING;
      `, [roomId, id, application.job_id, application.provider_id, application.seeker_id]).catch(e => console.error("Chat Room creation error:", e));

      publishEvent('job:events', 'status.changed', {
        application_id: id,
        job_id: application.job_id,
        provider_id: application.provider_id,
        seeker_id: application.seeker_id,
        job_title: application.title,
        status: 'accepted',
        provider_name: req.user.name || 'Provider'
      });
    } else if (status === 'rejected') {
      publishEvent('job:events', 'status.changed', {
        application_id: id,
        job_id: application.job_id,
        provider_id: application.provider_id,
        seeker_id: application.seeker_id,
        job_title: application.title,
        status: 'rejected'
      });
    } else if (status === 'completed') {
      publishEvent('job:events', 'job.completed', {
        application_id: id,
        job_id: application.job_id,
        provider_id: application.provider_id,
        seeker_id: application.seeker_id,
        job_title: application.title,
        provider_name: req.user.name || 'Provider'
      });
    }

    res.status(200).json({ success: true, application: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CHAT & MESSAGING
// ==========================================
app.post('/api/chat/messages', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    const { room_id, message } = req.body;
    
    if (!room_id || !message) {
      return res.status(400).json({ success: false, error: 'Missing room_id or message' });
    }

    // 1. Rate Limiting via Redis (1 message per second per user)
    const rateLimitKey = `rate_limit:chat:${req.internalUserId}`;
    // NX = Set if not exists, EX 1 = Expire in 1 second
    const isAllowed = await redisClient.set(rateLimitKey, '1', 'NX', 'EX', 1);
    
    if (!isAllowed) {
      return res.status(429).json({ success: false, error: 'Sending messages too fast. Please wait a moment.' });
    }

    // 2. Validate Room Access
    const roomRes = await db.query(`
      SELECT provider_id, seeker_id FROM chat_rooms WHERE id = $1
    `, [room_id]);

    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chat room not found' });
    }

    const room = roomRes.rows[0];
    if (room.provider_id !== req.internalUserId && room.seeker_id !== req.internalUserId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to post in this room' });
    }

    // 3. Insert Message (Supabase Realtime will automatically broadcast it)
    const result = await db.query(`
      INSERT INTO chat_messages (room_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [room_id, req.internalUserId, message]);

    res.status(201).json({ success: true, message: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// RATINGS & REPORTS
// ==========================================
app.post('/api/ratings', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    
    const { to_user_id, job_id, application_id, rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Invalid rating' });
    }

    if (!review || review.length < 20) {
      return res.status(400).json({ success: false, error: 'Review must be at least 20 characters long' });
    }

    const result = await db.query(`
      INSERT INTO reviews (from_user_id, to_user_id, job_id, application_id, rating, review)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [req.internalUserId, to_user_id, job_id, application_id, rating, review]);

    // Publish rating.done event
    publishEvent('job:events', 'rating.done', {
      rater_id: req.internalUserId,
      ratee_id: to_user_id,
      job_id,
      rating_id: result.rows[0].id,
      rating_value: rating
    });

    res.status(201).json({ success: true, rating: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, error: 'You have already rated this user for this job.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reports', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    
    const { reported_user_id, job_id, application_id, reason, details } = req.body;

    if (!reported_user_id || !reason) {
      return res.status(400).json({ success: false, error: 'Missing reported_user_id or reason' });
    }

    const result = await db.query(`
      INSERT INTO reports (reporter_id, reported_user_id, job_id, application_id, reason, details)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [req.internalUserId, reported_user_id, job_id, application_id, reason, details]);

    res.status(201).json({ success: true, report: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/applications/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    const appRes = await db.query(`
      SELECT a.seeker_id, a.job_id, j.provider_id, j.title 
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `, [id]);
    
    if (appRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Application not found' });
    
    const application = appRes.rows[0];
    const isProvider = application.provider_id === req.internalUserId;
    const isSeeker = application.seeker_id === req.internalUserId;

    if (!isProvider && !isSeeker) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Notify seeker before deleting
    if (isProvider) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Application Update', 'Your application for ' || $2 || ' was not selected.', 'app_rejected')
      `, [application.seeker_id, application.title]).catch(e => console.error("Notification creation error:", e));
    }

    const result = await db.query(`
      UPDATE job_applications SET is_deleted = true, deleted_at = NOW() WHERE id = $1 RETURNING id;
    `, [id]);

    res.status(200).json({ success: true, deletedId: id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

app.get('/api/notifications', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    
    const result = await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.internalUserId]);
    
    // Map 'message' to 'body' for frontend compatibility if needed
    const notifications = result.rows.map(n => ({
      ...n,
      body: n.message
    }));
    
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/notifications/:id/read', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    
    await db.query(`
      UPDATE notifications SET is_read = true 
      WHERE id = $1 AND user_id = $2
    `, [id, req.internalUserId]);
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KaamNow Backend Server running on port ${PORT}`);
});
