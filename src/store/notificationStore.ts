import { create } from 'zustand';
import type { AppNotification } from '../types';
import { apiFetch } from '../utils/apiClient';
import { firebaseAuth } from '../services/firebaseAuth';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  
  error: string | null;

  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  clearNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await apiFetch(`${apiUrl}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      
      set({
        notifications: data.notifications || [],
        unreadCount: (data.notifications || []).filter((n: any) => !n.is_read).length,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  markAsRead: async (id) => {
    set((state) => {
      const updated = state.notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length,
      };
    });

    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) return;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      await apiFetch(`${apiUrl}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.log('Failed to mark read remotely', e);
    }
  },

  clearNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },
  markAllAsRead: async () => {
    set((state) => {
      const updated = state.notifications.map(n => ({ ...n, is_read: true }));
      return {
        notifications: updated,
        unreadCount: 0,
      };
    });
  },

  addNotification: (notification) => {
    set((state) => {
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length,
      };
    });
  }
}));
