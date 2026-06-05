/**
 * userService.ts
 * All user-related Supabase operations.
 * Firebase handles auth; this service handles profile data in Postgres.
 *
 * Design notes:
 * - Uses supabase anon key (no server needed)
 * - Idempotent upsert pattern — safe to call multiple times
 * - All functions return typed User objects
 */
import { supabase } from './supabase';
import * as Sentry from '@sentry/react-native';
import { firebaseAuth } from './firebaseAuth';
import { apiFetch } from '../utils/apiClient';
import type { User } from '../types';

export interface CreateUserResult {
  /** True if this is the first time this phone number signed in */
  isNewUser: boolean;
  /** The user's Supabase profile row */
  user: User;
}

export interface ProfileUpdateData {
  name?: string;
  age?: number;
  role?: 'seeker' | 'employer' | 'provider';
  skills?: string[];
  bio?: string;
  avatar_url?: string;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  language?: 'en' | 'hi' | 'te';
  expected_salary?: number;
  preferred_pay_type?: 'hour' | 'day' | 'month';
}

class UserService {

  

  /**
   * Called immediately after successful Firebase OTP verification.
   *
   * Logic:
   * 1. Look up user by firebase_uid
   * 2. If exists → return { isNewUser: !profile_complete, user }
   * 3. If not exists → INSERT new row → return { isNewUser: true, user }
   *
   * This is idempotent — safe to call on every login.
   */
  async createOrGetUser(
    firebaseUid: string,
    phone: string
  ): Promise<CreateUserResult> {
    // Try to find existing user by Firebase UID
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (fetchError) {
      Sentry.captureException(new Error(`${'[UserService] createOrGetUser fetch error:'} ${fetchError}`));
      throw new Error('Failed to load your profile. Please try again.');
    }

    if (existing) {
      const isNewUser = !existing.is_profile_complete;
      return { isNewUser, user: this.mapRow(existing) };
    }

    // Fetch Firebase JWT to send to backend API
    const jwtToken = await firebaseAuth.getIdToken();
    if (!jwtToken) {
      throw new Error('Firebase authentication token missing.');
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

    let response: Response;
    try {
      response = await apiFetch(`${apiUrl}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ phone, role: 'seeker' }),
      });
    } catch (error) {
      console.log('[API] Backend unreachable:', error);
      throw new Error('Backend not reachable. Please check your connection.');
    }

    let result: any = {};
    try {
      result = await response.json();
    } catch {
      throw new Error('Invalid response from server.');
    }

    if (!response.ok) {
      Sentry.captureException(new Error(`[UserService] backend profile creation error: ${result.error}`));
      throw new Error(result.error || 'Failed to create user profile on backend.');
    }

    if (result.user) {
      return { isNewUser: true, user: this.mapRow(result.user) };
    } else {
      throw new Error('Failed to create user profile on backend. Empty response.');
    }
  }

  /**
   * Fetches a full user profile from Supabase by internal UUID.
   * Joins user_location to get city/state but skips exact lat/long for privacy.
   */
  async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_location (
          city,
          state
        )
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      Sentry.captureException(new Error(`${'[UserService] getUserById error:'} ${error}`));
      return null;
    }

    if (!data) return null;

    // Use city/state as location_name if available, hiding exact lat/lng
    const location = data.user_location?.[0];
    const location_name = location?.city 
      ? `${location.city}${location.state ? ', ' + location.state : ''}` 
      : data.location_name;

    return this.mapRow({ ...data, location_name, location_lat: null, location_lng: null });
  }

  /**
   * Fetches a full user profile from Supabase by Firebase UID.
   * Returns null if not found (shouldn't happen after login).
   */
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      Sentry.captureException(new Error(`${'[UserService] getUserByFirebaseUid error:'} ${error}`));
      return null;
    }

    return data ? this.mapRow(data) : null;
  }

  /**
   * Checks if a phone number is already registered.
   */
  async checkUserExists(phone: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      Sentry.captureMessage(`${'[UserService] checkUserExists error:'} ${error}`);
    }
    return !!data;
  }

  /**
   * Creates a full user profile after a successful OTP verification
   * for a brand new user who just completed the signup flow.
   */
  async createFullProfile(
    firebaseUid: string,
    phone: string,
    profileData: {
      name: string;
      age: number;
      role: 'seeker' | 'employer' | 'provider';
      skills: string[];
    }
  ): Promise<CreateUserResult> {
    const jwtToken = await firebaseAuth.getIdToken();
    if (!jwtToken) {
      throw new Error('Firebase authentication token missing.');
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

    let response: Response;
    try {
      response = await apiFetch(`${apiUrl}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          phone,
          ...profileData,
          is_profile_complete: true,
        }),
      });
    } catch (error) {
      console.log('[API] Backend unreachable:', error);
      throw new Error('Backend not reachable. Please check your connection.');
    }

    let result: any = {};
    try {
      result = await response.json();
    } catch {
      throw new Error('Invalid response from server.');
    }

    if (!response.ok) {
      Sentry.captureException(new Error(`[UserService] createFullProfile error: ${result.error}`));
      throw new Error(result.error || 'Failed to create user profile.');
    }

    if (result.user) {
      return { isNewUser: true, user: this.mapRow(result.user) };
    } else {
      throw new Error('Failed to create user profile on backend. Empty response.');
    }
  }

  /**
   * Updates a user's profile after the signup form is submitted.
   * Sets is_profile_complete = true so returning users skip signup.
   */
  async updateProfile(
    userId: string,
    data: ProfileUpdateData
  ): Promise<User> {
    const jwtToken = await firebaseAuth.getIdToken();
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

    let response: Response;
    try {
      response = await apiFetch(`${apiUrl}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          ...data,
          is_profile_complete: true,
        }),
      });
    } catch (error) {
      console.log('[API] Backend unreachable:', error);
      throw new Error('Backend not reachable. Please check your connection.');
    }

    // Parse JSON only after we have a response object
    let result: any = {};
    try {
      result = await response.json();
    } catch {
      throw new Error('Invalid response from server. Please try again.');
    }

    if (!response.ok || !result.success) {
      Sentry.captureException(new Error(`[UserService] updateProfile error: ${result.error}`));
      throw new Error(result.error || 'Failed to save your profile. Please try again.');
    }

    return this.mapRow(result.user);
  }

  /**
   * Saves/updates the Expo push notification token.
   * Called after notification permission is granted.
   */
  async updatePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      Sentry.captureMessage(`${'[UserService] updatePushToken error:'} ${error.message}`);
    }
  }

  /**
   * Updates the user's last known location.
   * Called when location permission is granted or location changes.
   */
  async updateLocation(
    userId: string,
    lat: number,
    lng: number,
    name?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        location_lat: lat,
        location_lng: lng,
        location_name: name ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      Sentry.captureMessage(`${'[UserService] updateLocation error:'} ${error.message}`);
    }
  }

  /**
   * Marks user as blocked (admin use). Safe to ignore errors silently.
   */
  async blockUser(userId: string): Promise<void> {
    await supabase
      .from('users')
      .update({ is_blocked: true })
      .eq('id', userId);
  }

  /**
   * Maps a raw Supabase/Postgres database row to the typed User interface.
   * Handles both old and new column naming conventions defensively.
   */
  private mapRow(row: Record<string, any>): User {
    return {
      id: row.id,
      firebase_uid: row.firebase_uid,
      // DB uses `phone`, legacy rows might have `phone_number`
      phone: row.phone ?? row.phone_number ?? null,
      name: row.name ?? null,
      age: row.age ?? row.experience ?? null,
      bio: row.bio ?? null,
      avatar_url: row.avatar_url ?? row.profile_image ?? null,
      role: row.role ?? 'seeker',
      skills: row.skills ?? [],
      language: row.language ?? 'en',
      location_lat: row.location_lat ?? null,
      location_lng: row.location_lng ?? null,
      location_name: row.location_name ?? null,
      jobs_completed: row.jobs_completed ?? 0,
      jobs_posted: row.jobs_posted ?? 0,
      worker_rating: parseFloat(row.worker_rating ?? row.rating_average ?? '0'),
      employer_rating: parseFloat(row.employer_rating ?? '0'),
      total_reviews: row.total_reviews ?? row.rating_count ?? 0,
      is_verified: row.is_verified ?? false,
      is_blocked: row.is_blocked ?? row.is_deleted ?? false,
      expo_push_token: row.expo_push_token ?? null,
      trust_score: parseFloat(row.trust_score ?? '50'),
      reports: row.reports ?? 0,
      attendance: parseFloat(row.attendance ?? '100'),
      response_rate: parseFloat(row.response_rate ?? '100'),
      expected_salary: row.expected_salary ?? undefined,
      preferred_pay_type: row.preferred_pay_type ?? undefined,
      is_profile_complete: row.is_profile_complete ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as User;
  }
}

export const userService = new UserService();
