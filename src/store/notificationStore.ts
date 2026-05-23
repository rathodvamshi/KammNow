import { create } from 'zustand';
import type { AppNotification } from '../types';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: AppNotification) => void;
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    user_id: 'user-001',
    type: 'app_accepted',
    title: 'Application Accepted! 🎉',
    body: 'QuickMart Ameerpet has accepted your application for Event Staff Crew.',
    data: { applicationId: 'app-101' },
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    user_id: 'user-001',
    type: 'new_application',
    title: 'New Message',
    body: 'You have a new message from Zepto Ameerpet.',
    data: { roomId: 'room-1' },
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 600));
    set({
      notifications: MOCK_NOTIFICATIONS,
      unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.is_read).length,
      isLoading: false,
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length,
      };
    });
  },

  markAllAsRead: () => {
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
