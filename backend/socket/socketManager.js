'use strict';

const { Server } = require('socket.io');
const admin = require('firebase-admin');
const logger = require('../utils/logger');

// In-memory map: userId (internal UUID) → Set of socket IDs
// Using a Set because one user can be on multiple devices
const userSockets = new Map(); // userId → Set<socketId>
const socketUsers = new Map(); // socketId → userId (for disconnect cleanup)

let _io = null;

/**
 * Initialize the Socket.IO server and attach event handlers.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function init(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    // Use WebSocket transport first, fall back to polling
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // ── Auth Middleware ──────────────────────────────────────────────────────────
  // Verify Firebase token on every connection handshake
  _io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || token === 'null') {
        return next(new Error('Authentication required'));
      }
      const decoded = await admin.auth().verifyIdToken(token);
      socket.firebaseUid = decoded.uid;
      next();
    } catch (err) {
      logger.warn({ err: err.message }, '[Socket] Auth failed');
      next(new Error('Invalid token'));
    }
  });

  // ── Connection Handler ───────────────────────────────────────────────────────
  _io.on('connection', (socket) => {
    // The controller will call registerUser once the internal userId is known
    // The client sends { event: 'register', userId } right after connect
    socket.on('register', ({ userId }) => {
      if (!userId) return;

      // Track user → sockets
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      socketUsers.set(socket.id, userId);

      // Join a personal room keyed by internal UUID
      socket.join(userId);

      socket.emit('authenticated', { userId });
      logger.info({ userId, socketId: socket.id }, '[Socket] User registered');
    });

    socket.on('disconnect', (reason) => {
      const userId = socketUsers.get(socket.id);
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
          }
        }
        socketUsers.delete(socket.id);
        logger.info({ userId, reason }, '[Socket] User disconnected');
      }
    });

    socket.on('error', (err) => {
      logger.error({ err: err.message }, '[Socket] Socket error');
    });
  });

  logger.info('[Socket] Socket.IO server initialized');
  return _io;
}

/**
 * Emit an event to a specific user's room.
 * Safe to call even if the user is offline — event is simply dropped.
 * @param {string} userId  Internal UUID of the target user
 * @param {string} event   Socket event name
 * @param {any}    data    Payload to send
 */
function emitToUser(userId, event, data) {
  if (!_io) {
    logger.warn('[Socket] emitToUser called before init()');
    return;
  }
  if (!userId) return;
  _io.to(userId).emit(event, data);
  logger.debug({ userId, event }, '[Socket] Event emitted');
}

/**
 * Broadcast an event to all connected clients.
 * Use sparingly — prefer targeted emitToUser.
 */
function broadcast(event, data) {
  if (!_io) return;
  _io.emit(event, data);
}

/**
 * Get the Socket.IO server instance.
 */
function getIO() {
  return _io;
}

module.exports = { init, emitToUser, broadcast, getIO };
