const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

// All routes here will be prefixed with /api/jobs in index.js, but they need authenticateUser.
// We will apply authenticateUser middleware in the main router file.

// Notice: express rate limiter needs to be passed in for POST /api/jobs.
// We'll skip it in the modular file for a second and apply it via index.js or inline if imported.

const { createJobSchema } = require('../validators/job');
const rateLimit = require('express-rate-limit');

// Rate limit: 10 job posts per day
const postJobLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10
});

// Validation middleware
const validateJob = (req, res, next) => {
  const result = createJobSchema.safeParse(req.body);
  if (!result.success) {
    console.error('[Job Validation Failed]', JSON.stringify(result.error, null, 2));
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: result.error.errors
    });
  }
  req.body = result.data; // replace body with coerced valid data
  next();
};

router.get('/feed', jobController.getFeed);
router.get('/', jobController.getMyJobs);
router.post('/', postJobLimiter, validateJob, jobController.createJob);
router.put('/:id/status', jobController.updateJobStatus);
router.delete('/:id', jobController.deleteJob);

module.exports = router;
