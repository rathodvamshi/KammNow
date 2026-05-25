import { Job, User } from '../types';
import * as Sentry from '@sentry/react-native';
import { InteractionManager } from 'react-native';
import { supabase } from './supabase';
import { firebaseAuth } from './firebaseAuth';
import { apiFetch } from '../utils/apiClient';
import { haversineDistance } from '../utils/helpers';

export interface MatchingParams {
  user: User;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
  category?: string;
  filters?: {
    sort_by?: 'pay_high_to_low' | 'distance' | 'date_posted';
    min_pay?: number;
  };
  maxDistance?: number; // km
  searchTerm?: string;
}

// ── FeedScore components (NearWork spec) ────────────────────────────────────

/**
 * DistanceScore = 1 - (distance_km / 10)
 * 0km away → 1.0, 9km away → 0.1, ≥10km → 0 (clamped)
 */
function distanceScore(distance_km: number): number {
  return Math.max(0, Math.min(1, 1 - distance_km / 10));
}

/**
 * RecencyScore = e^(-age_hours / 12)
 * 1 hr ago → ~0.92, 12 hrs ago → ~0.37, 24 hrs ago → ~0.14
 */
function recencyScore(createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.exp(-ageHours / 12);
}

/**
 * SkillMatchScore = matched_skills / required_skills
 * Returns 0.5 when the job has no required skills (neutral, not penalised).
 */
function skillMatchScore(userSkills: string[], requiredSkills: string[]): number {
  if (!requiredSkills || requiredSkills.length === 0) return 0.5;
  const userSet = new Set(userSkills.map((s) => s.toLowerCase()));
  const matched = requiredSkills.filter((s) => userSet.has(s.toLowerCase())).length;
  return matched / requiredSkills.length;
}

/**
 * Full FeedScore formula (NearWork spec):
 *   FeedScore = 0.40 × DistanceScore
 *             + 0.25 × RecencyScore
 *             + 0.20 × ProviderTrustScore (normalised 0–1)
 *             + 0.15 × SkillMatchScore
 */
function computeFeedScore(
  distance_km: number,
  createdAt: string,
  providerTrustScore: number, // 0–100
  userSkills: string[],
  requiredSkills: string[],
): number {
  const dScore = distanceScore(distance_km);
  const rScore = recencyScore(createdAt);
  const tScore = Math.max(0, Math.min(1, providerTrustScore / 100));
  const sScore = skillMatchScore(userSkills, requiredSkills);

  return 0.40 * dScore + 0.25 * rScore + 0.20 * tScore + 0.15 * sScore;
}

// ── Main matching engine ─────────────────────────────────────────────────────

export const matchingEngine = {
  getRecommendations: async (
    params: MatchingParams,
  ): Promise<(Job & { matchScore: number; distance_km: number })[]> => {
    const { user, location, category, filters, maxDistance = 50, searchTerm } = params;

    let rawJobs: any[] = [];

    if (location?.latitude && location?.longitude) {
      // Use the new Node backend endpoint to take advantage of Redis caching
      try {
        const token = await firebaseAuth.getIdToken();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        
        const response = await apiFetch(`${apiUrl}/api/jobs/feed?lat=${location.latitude}&lon=${location.longitude}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (data.success) {
          rawJobs = data.jobs;
        } else {
          throw new Error(data.error);
        }
      } catch (err: any) {
        Sentry.captureException(new Error('Feed fetch error: ' + err.message));
      }
    } else {
      // Fallback when no GPS fix: fetch recent active jobs, rank without distance
      try {
        const token = await firebaseAuth.getIdToken();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        
        const response = await apiFetch(`${apiUrl}/api/jobs/feed`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (data.success) {
          rawJobs = data.jobs;
        } else {
          throw new Error(data.error);
        }
      } catch (err: any) {
        Sentry.captureException(new Error('Fallback feed fetch error: ' + err.message));
      }
    }

    // ── Map DB schema → frontend Job type ────────────────────────────────────
    // The RPC returns FLAT columns: location_lat, location_lng (not nested objects).
    // distance_km is already computed in SQL (ST_Distance / 1000.0).
    const jobs = (rawJobs || []).map((dbJob: any) => {
      const hasLocation = dbJob.location_lat != null && dbJob.location_lng != null;
      const lat = dbJob.location_lat ?? 0;
      const lng = dbJob.location_lng ?? 0;

      // If distance_km comes from the backend, use it; otherwise compute client-side
      const distKm: number | null =
        dbJob.distance_km != null
          ? Number(dbJob.distance_km)
          : (hasLocation && location)
          ? haversineDistance(location.latitude, location.longitude, lat, lng)
          : null;

      return {
        id: dbJob.id,
        title: dbJob.title,
        description: dbJob.description,
        poster_id: dbJob.provider_id,
        poster_name: dbJob.provider?.name ?? 'Unknown',
        poster_avatar: dbJob.provider?.profile_image ?? null,
        category: dbJob.category_id ?? 'other',
        pay_amount: dbJob.salary ?? 0,
        pay_type: dbJob.salary_type ?? 'day',
        location_name: dbJob.location_name ?? dbJob.full_address ?? 'Location N/A',
        location_lat: lat,
        location_lng: lng,
        status: dbJob.status,
        created_at: dbJob.created_at,
        is_urgent: dbJob.is_urgent ?? false,
        required_skills: dbJob.required_skills ?? [],
        employer_trust_score: dbJob.provider?.trust_score ?? 50,
        employer_reports: dbJob.provider?.reports ?? 0,
        employer_verified: dbJob.provider?.is_verified ?? false,
        distance_km: distKm,
      } as Job & { distance_km: number };
    });

    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        // ── Step 1: Filter ─────────────────────────────────────────────────
        let filtered = jobs.filter((job: any) => {
          // Trust gate: hard remove providers with very low trust or flagged accounts
          if ((job.employer_trust_score ?? 100) < 30) return false;
          if ((job.employer_reports ?? 0) >= 3) return false;

          // Full-text search (client-side, before Elasticsearch is integrated)
          if (searchTerm && searchTerm.trim().length > 0) {
            const haystack = `${job.title} ${job.description}`.toLowerCase();
            const terms = searchTerm
              .toLowerCase()
              .split(/\s+/)
              .filter((t) => t.length > 0);
            if (!terms.every((t) => haystack.includes(t))) return false;
          }

          // Category filter
          if (category && category !== 'all') {
            if (category === 'urgent' && !job.is_urgent) return false;
            if (category !== 'urgent' && job.category !== category) return false;
          }

          // Min pay filter
          if (filters?.min_pay && job.pay_amount < filters.min_pay) return false;

          // Distance hard cap (PostGIS already filters, this is a safety net for fallback path)
          if (location && job.distance_km > maxDistance) return false;

          return true;
        });

        // ── Step 2: Rank with FeedScore or override sort ───────────────────
        const userSkills = user?.skills?.map((s) => s.toLowerCase()) ?? [];

        filtered = filtered.map((job: any) => {
          const feedScore = computeFeedScore(
            job.distance_km,
            job.created_at,
            job.employer_trust_score ?? 50,
            userSkills,
            job.required_skills ?? [],
          );

          return { ...job, matchScore: feedScore };
        });

        // Sort
        if (filters?.sort_by === 'pay_high_to_low') {
          filtered.sort((a: any, b: any) => b.pay_amount - a.pay_amount);
        } else if (filters?.sort_by === 'distance') {
          filtered.sort((a: any, b: any) => a.distance_km - b.distance_km);
        } else if (filters?.sort_by === 'date_posted') {
          filtered.sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
        } else {
          // Default: FeedScore descending (best match first)
          filtered.sort((a: any, b: any) => b.matchScore - a.matchScore);
        }

        resolve(filtered.slice(0, 30) as any);
      });
    });
  },
};
