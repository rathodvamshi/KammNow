import { create } from 'zustand';
import i18n from '../i18n';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  language: 'en' | 'hi' | 'te';
  inboxBadgeCount: number;
  toasts: Toast[];
  isOffline: boolean;
  currentRole: 'seeker' | 'provider';
  setLanguage: (lang: 'en' | 'hi' | 'te') => void;
  setInboxBadgeCount: (count: number) => void;
  incrementBadge: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  setOffline: (offline: boolean) => void;
  setRole: (role: 'seeker' | 'provider') => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: 'en',
  inboxBadgeCount: 0,
  toasts: [],
  isOffline: false,
  currentRole: 'seeker',

  setLanguage: (language) => {
    i18n.changeLanguage(language);
    set({ language });
  },

  setInboxBadgeCount: (inboxBadgeCount) => set({ inboxBadgeCount }),

  incrementBadge: () =>
    set((state) => ({ inboxBadgeCount: state.inboxBadgeCount + 1 })),

  showToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setOffline: (isOffline) => set({ isOffline }),

  setRole: (currentRole) => set({ currentRole }),
}));
