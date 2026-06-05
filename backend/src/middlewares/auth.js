const admin = require('firebase-admin');
const db = require('../../db');
const logger = require('../../utils/logger');
const { redis } = require('../../redis');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn({ header: authHeader }, 'Missing or invalid auth header');
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split('Bearer ')[1];
    if (token === 'null') {
      logger.warn('Token is literally the string "null"');
      return res.status(401).json({ success: false, message: 'Unauthorized: Token is null' });
    }
    
    // Verify Firebase JWT using Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; 
    
    // Try cache first
    let internalId = null;
    const cacheKey = `user:firebase:${decodedToken.uid}`;
    
    if (redis) {
      internalId = await redis.get(cacheKey);
    }
    
    if (!internalId) {
      // Inject internal UUID if the user exists
      const userRes = await db.query('SELECT id FROM users WHERE firebase_uid = $1 AND is_deleted = false', [decodedToken.uid]);
      if (userRes.rows.length > 0) {
        internalId = userRes.rows[0].id;
        
        if (redis) {
          // Cache for 24 hours (86400 seconds)
          await redis.setex(cacheKey, 86400, internalId);
        }
      }
    }
    
    req.internalUserId = internalId;
    
    next();
  } catch (error) {
    logger.error({ err: error.message }, 'Authentication error');
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

module.exports = { authenticateUser };
