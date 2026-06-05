const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { profileSchema } = require('../validators/user');

const validateProfile = (req, res, next) => {
  const result = profileSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.errors });
  }
  req.body = result.data;
  next();
};

// These routes will be prefixed with /api/users
router.post('/profile', validateProfile, userController.upsertProfile);
router.post('/location', userController.updateLocation);
router.get('/addresses', userController.getAddresses);
router.post('/heartbeat', userController.updateHeartbeat);

module.exports = router;
