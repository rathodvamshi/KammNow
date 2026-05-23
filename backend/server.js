require('dotenv').config({ path: '../.env' }); // Load root .env
require('dotenv').config(); // Load backend .env (if it exists)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const db = require('./db');

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
app.use('/api/', limiter);

// 4. Authentication Middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split('Bearer ')[1];
    
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
    console.error('Auth Error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// 5. API Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// USER PROFILES
// ==========================================
app.post('/api/users/profile', authenticateUser, async (req, res) => {
  try {
    const { phone, role = 'seeker', name, bio, gender, languages, skills, experience } = req.body;
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
    console.error('Profile creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    const existing = await db.query('SELECT id FROM user_location WHERE user_id = $1 AND is_deleted = false', [req.internalUserId]);
    
    let result;
    if (existing.rows.length > 0) {
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

// ==========================================
// JOBS
// ==========================================
app.post('/api/jobs', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    
    const { title, description, salary, salary_type, job_type, experience_required, category_id, location_id } = req.body;

    const result = await db.query(`
      INSERT INTO jobs (provider_id, title, description, salary, salary_type, job_type, experience_required, category_id, location_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [req.internalUserId, title, description, salary, salary_type, job_type, experience_required, category_id, location_id]);

    res.status(201).json({ success: true, job: result.rows[0] });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/jobs/:id/status', authenticateUser, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });

    // Ensure the user owns the job
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

// ==========================================
// APPLICATIONS
// ==========================================
app.post('/api/applications', authenticateUser, async (req, res) => {
  try {
    if (!req.internalUserId) return res.status(404).json({ success: false, error: 'User profile not found' });
    const { job_id } = req.body;

    // Insert ignoring duplicate constraint via DO NOTHING or return error
    const result = await db.query(`
      INSERT INTO job_applications (job_id, seeker_id)
      VALUES ($1, $2)
      ON CONFLICT (job_id, seeker_id) DO NOTHING
      RETURNING *;
    `, [job_id, req.internalUserId]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'You have already applied for this job.' });
    }
    
    // Increment applicants_count
    await db.query('UPDATE jobs SET applicants_count = applicants_count + 1 WHERE id = $1', [job_id]);

    res.status(201).json({ success: true, application: result.rows[0] });
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
      SELECT a.seeker_id, j.provider_id 
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

    res.status(200).json({ success: true, application: result.rows[0] });
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
