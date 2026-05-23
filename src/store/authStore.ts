/**
 * authStore.ts
 * Central auth state manager using Zustand.
 *
 * Session lifecycle:
 * 1. App cold start → initSession() reads SecureStore → fast-path UI restore
 * 2. Firebase onAuthStateChanged (in _layout.tsx) → hydrates full profile
 * 3. User logs out → logout() clears Firebase + SecureStore + Zustand
 *
 * SecureStore keys:
 *   kn_firebase_uid  — Firebase UID (for fast restore check)
 *   kn_user_id       — Supabase user UUID (for fast profile fetch)
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { User } from '../types';

// ─── SecureStore keys ────────────────────────────────────────────
const KEY_FIREBASE_UID = 'kn_firebase_uid';
const KEY_USER_ID = 'kn_user_id';

// ─── Helpers ─────────────────────────────────────────────────────
const secureGet = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
};
const secureSet = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  try { await SecureStore.setItemAsync(key, value); } catch {}
};
const secureDel = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  try { await SecureStore.deleteItemAsync(key); } catch {}
};

// ─── State Interface ──────────────────────────────────────────────
interface AuthState {
  /** Full user profile from Supabase */
  user: User | null;
  /** True when Firebase user is confirmed signed-in */
  isAuthenticated: boolean;
  /** True while initSession / OTP verify is in progress */
  isLoading: boolean;
  /** Firebase UID — kept separate for easy access without full User object */
  firebaseUid: string | null;

  // ─── Actions ──────────────────────────────────────────────────
  /**
   * Called once on app cold-start from _layout.tsx.
   * Checks SecureStore for a cached session so we can show a loading
   * state (not a blank screen) while Firebase confirms auth.
   */
  initSession: () => Promise<{ hasCache: boolean; cachedFirebaseUid: string | null }>;

  /**
   * Called by the Firebase onAuthStateChanged listener in _layout.tsx
   * after profile is fetched from Supabase.
   */
  setUser: (user: User | null) => void;

  /**
   * Called after OTP verify + Supabase createOrGetUser() succeeds.
   * Persists session keys to SecureStore for next cold-start.
   */
  setFirebaseSession: (firebaseUid: string, userId: string) => Promise<void>;

  setLoading: (loading: boolean) => void;
  setFirebaseUid: (uid: string | null) => void;

  /** Partial update — e.g., after profile edit */
  updateUser: (partial: Partial<User>) => void;

  /**
   * Full logout: clears Zustand state + SecureStore.
   * Firebase signOut() is called separately in firebaseAuth.ts.
   */
  logout: () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading — will be set false after initSession
  firebaseUid: null,

  // ── initSession ───────────────────────────────────────────────
  initSession: async () => {
    const cachedFirebaseUid = await secureGet(KEY_FIREBASE_UID);
    const cachedUserId = await secureGet(KEY_USER_ID);

    if (cachedFirebaseUid && cachedUserId) {
      // We have a cached session — show loading while Firebase confirms
      set({ firebaseUid: cachedFirebaseUid, isLoading: true });
      return { hasCache: true, cachedFirebaseUid };
    }

    // No cache → definitely not logged in
    set({ isLoading: false });
    return { hasCache: false, cachedFirebaseUid: null };
  },

  // ── setUser ───────────────────────────────────────────────────
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      firebaseUid: user?.firebase_uid ?? get().firebaseUid,
    });
  },

  // ── setFirebaseSession ────────────────────────────────────────
  setFirebaseSession: async (firebaseUid, userId) => {
    set({ firebaseUid });
    await secureSet(KEY_FIREBASE_UID, firebaseUid);
    await secureSet(KEY_USER_ID, userId);
  },

  // ── setLoading ────────────────────────────────────────────────
  setLoading: (isLoading) => set({ isLoading }),

  // ── setFirebaseUid ────────────────────────────────────────────
  setFirebaseUid: (firebaseUid) => set({ firebaseUid }),

  // ── updateUser ────────────────────────────────────────────────
  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  // ── logout ────────────────────────────────────────────────────
  logout: async () => {
    // Clear persisted session
    await secureDel(KEY_FIREBASE_UID);
    await secureDel(KEY_USER_ID);

    // Reset Zustand state
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      firebaseUid: null,
    });
  },
}));
