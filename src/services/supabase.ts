/**
 * supabase.ts
 * Supabase client — uses anon (publishable) key.
 * Firebase handles authentication; Supabase handles all data storage.
 */
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * SecureStore adapter for React Native.
 * Falls back to no-op on web (SecureStore is native-only).
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return null;
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') return;
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') return;
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

/**
 * Base Supabase client — for public/read operations.
 * persistSession: false because Firebase manages the auth session, not Supabase Auth.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: { 'x-app-platform': 'react-native' },
  },
});


export default supabase;
