import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  firebaseUid: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setFirebaseUid: (uid: string | null) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  firebaseUid: null,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  setFirebaseUid: (firebaseUid) => set({ firebaseUid }),

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  logout: () =>
    set({ user: null, isAuthenticated: false, firebaseUid: null }),
}));
