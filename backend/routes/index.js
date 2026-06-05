const express = require('express');
const router = express.Router();

const jobRoutes = require('./jobRoutes');
const applicationRoutes = require('./applicationRoutes');
const chatRoutes = require('./chatRoutes');
const userRoutes = require('./userRoutes');

const { authenticateUser } = require('../src/middlewares/auth');

// We apply the authenticateUser middleware to all protected routes
router.use('/jobs', authenticateUser, jobRoutes);
router.use('/applications', authenticateUser, applicationRoutes);
router.use('/chat', authenticateUser, chatRoutes);
router.use('/users', authenticateUser, userRoutes);

// Admin and Misc endpoints (we'll keep them here for now until fully extracted)
// ...

module.exports = router;
