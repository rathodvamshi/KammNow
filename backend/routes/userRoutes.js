const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const addressController = require('../controllers/addressController');
const { profileSchema } = require('../validators/user');

const validateProfile = (req, res, next) => {
  const result = profileSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.errors });
  }
  req.body = result.data;
  next();
};

// ── Profile ──────────────────────────────────────────────────────────────────
router.post('/profile', validateProfile, userController.upsertProfile);
router.post('/heartbeat', userController.updateHeartbeat);
router.post('/location', userController.updateLocation);

// ── Saved Addresses (full CRUD) ───────────────────────────────────────────────
router.get('/addresses', addressController.getAddresses);
router.post('/addresses', addressController.addAddress);
router.put('/addresses/:id', addressController.editAddress);
router.delete('/addresses/:id', addressController.deleteAddress);

module.exports = router;
