// Load and validate env vars — must be first
require('./config/env'); // validates all required vars on startup
require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const logger = require('./utils/logger');
const socketManager = require('./socket/socketManager');

// 1. Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'kammnow-ac625',
    });
    console.log('Firebase Admin SDK initialized successfully.');
  }
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
}

const app = express();

// 2. Security & Monitoring Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow: mobile app (no origin), localhost, and LAN IP dev builds
    const allowed = !origin
      || origin.startsWith('http://localhost')
      || origin.startsWith('http://192.168.')
      || origin.startsWith('http://10.')
      || origin.startsWith('exp://');
    callback(null, allowed);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// Performance Monitoring Middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    // Log slow queries (> 500ms)
    if (duration > 500) {
      logger.warn(`[SLOW API] ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
    // Track memory usage occasionally (1% of requests)
    if (Math.random() < 0.01) {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      if (heapUsedMB > 500) {
        logger.warn(`[HIGH MEMORY] Heap used: ${heapUsedMB} MB`);
      }
    }
  });
  next();
});

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// 3. Base Health Routes
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Backend running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 4. Mount Modular API Routes
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);

// 5. Centralized Error Handling Middleware
Sentry.setupExpressErrorHandler(app);
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 6. Create HTTP server & attach Socket.IO
const httpServer = http.createServer(app);
socketManager.init(httpServer);

// Make socket manager accessible in controllers via app locals
app.locals.socketManager = socketManager;

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KaamNow Backend Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO realtime server active`);
});
