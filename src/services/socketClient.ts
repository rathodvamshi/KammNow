/**
 * socketClient.ts
 *
 * Singleton Socket.IO client — one connection for the entire app lifetime.
 * Initialised once after login, destroyed on logout.
 *
 * Usage:
 *   import socketClient from '../services/socketClient';
 *   socketClient.connect(token, internalUserId);
 *   socketClient.on('new_job', handler);
 *   socketClient.off('new_job', handler);
 *   socketClient.disconnect();
 */

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class SocketClient {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private isConnecting = false;

  /** Connect to the server with a valid Firebase token */
  connect(token: string, internalUserId: string) {
    // Already connected and same user — skip
    if (this.socket?.connected && this.userId === internalUserId) return;

    // Disconnect any stale socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;
    this.userId = internalUserId;

    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Register the user's internal UUID so the server can route events
      this.socket?.emit('register', { userId: internalUserId });
      this.isConnecting = false;
    });

    this.socket.on('authenticated', ({ userId }: { userId: string }) => {
      console.log('[Socket] Authenticated as', userId);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      this.isConnecting = false;
    });
  }

  /** Disconnect and clean up */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.isConnecting = false;
    console.log('[Socket] Disconnected by client');
  }

  /** Listen to a socket event */
  on<T = any>(event: string, callback: (data: T) => void) {
    this.socket?.on(event, callback);
  }

  /** Remove a specific listener */
  off<T = any>(event: string, callback: (data: T) => void) {
    this.socket?.off(event, callback);
  }

  /** Whether the socket is currently connected */
  get connected() {
    return this.socket?.connected ?? false;
  }

  /** Raw socket instance (use sparingly) */
  getSocket() {
    return this.socket;
  }
}

// Singleton — one instance for the entire app
const socketClient = new SocketClient();
export default socketClient;
