import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import type { Job } from '../types';
import { firebaseAuth } from '../services/firebaseAuth';
import { apiFetch } from '../utils/apiClient';
import { sanitizeJobs } from '../utils/sanitizers';

interface JobState {
  myPostedJobs: Job[];
  isLoading: boolean;
  error: string | null;
  _lastFetchedAt: number; // timestamp of last successful fetch

  fetchMyJobs: (userId: string) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  createJob: (jobData: any) => Promise<Job>;

  cachedFeed: any[];
  setCachedFeed: (feed: any[]) => void;

  // ── Realtime socket actions ────────────────────────────────────────────────
  /** Prepend a newly-arrived job to the live feed (from socket event) */
  prependToFeed: (job: any) => void;
  /** Remove a job from the feed by ID (on job_deleted event) */
  removeFromFeed: (jobId: string) => void;
  /** Increment applicant count on a provider job (on job_application_received) */
  incrementApplicantCount: (jobId: string, newCount: number) => void;
}

const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// Bulletproof dedup guard using globalThis — survives module re-imports and
// Metro hot-reload. No matter how many components call fetchMyJobs at the same
// time, only ONE HTTP request will go to the server.
// ─────────────────────────────────────────────────────────────────────────────
const g = globalThis as any;
const getInFlight = (): Promise<void> | null => g.__fetchMyJobsInFlight ?? null;
const setInFlight = (p: Promise<void> | null) => { g.__fetchMyJobsInFlight = p; };

// Minimum milliseconds between re-fetches even after the guard clears.
const FETCH_COOLDOWN_MS = 30_000; // 30 seconds

export const useJobStore = create<JobState>()(
  persist(
    (set, get) => ({
      myPostedJobs: [],
      cachedFeed: [],
      isLoading: false,
      error: null,
      _lastFetchedAt: 0,

      setCachedFeed: (feed: any[]) => set({ cachedFeed: feed }),

      // ── Realtime socket actions ──────────────────────────────────────────
      prependToFeed: (job: any) =>
        set((state) => ({
          cachedFeed: [job, ...state.cachedFeed.filter((j) => j?.id !== job?.id)],
        })),

      removeFromFeed: (jobId: string) =>
        set((state) => ({
          cachedFeed: state.cachedFeed.filter((j) => j?.id !== jobId),
          myPostedJobs: state.myPostedJobs.filter((j) => j?.id !== jobId),
        })),

      incrementApplicantCount: (jobId: string, newCount: number) =>
        set((state) => ({
          myPostedJobs: state.myPostedJobs.map((j) =>
            j?.id === jobId ? { ...j, applicants_count: newCount } : j
          ),
        })),
      // ────────────────────────────────────────────────────────────────────

      // ── fetchMyJobs ──────────────────────────────────────────────────────
      // Two-layer protection:
      //  Layer 1: globalThis in-flight guard  → deduplicates concurrent calls
      //  Layer 2: 30-second cooldown          → skips stale re-fetches from
      //           dependency-array re-fires (e.g. user object reference change)
      fetchMyJobs: async (_userId: string) => {
        // Layer 1: if a fetch is already running, reuse it
        const existing = getInFlight();
        if (existing) return existing;

        // Layer 2: skip if we fetched very recently
        const lastFetch = get()._lastFetchedAt;
        if (Date.now() - lastFetch < FETCH_COOLDOWN_MS) return;

        const promise = (async () => {
          set({ isLoading: true, error: null });
          try {
            const token = await firebaseAuth.getIdToken();
            if (!token) throw new Error('Not authenticated');

            const response = await apiFetch(`${getApiUrl()}/api/jobs`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to fetch my jobs');
            const { data } = await response.json();

            set({ myPostedJobs: sanitizeJobs(data), isLoading: false, _lastFetchedAt: Date.now() });
          } catch (error: any) {
            Sentry.captureException(new Error(`fetchMyJobs error: ${error}`));
            set({ error: error.message || 'Failed to fetch jobs', isLoading: false });
          } finally {
            setInFlight(null); // always release the guard
          }
        })();

        setInFlight(promise);
        return promise;
      },

      // ── updateStatus ─────────────────────────────────────────────────────
      updateStatus: async (id: string, status: string) => {
        try {
          const token = await firebaseAuth.getIdToken();
          if (!token) throw new Error('Not authenticated');

          const response = await apiFetch(`${getApiUrl()}/api/jobs/${id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
          });

          if (!response.ok) throw new Error('Failed to update status on backend');
          const { job } = await response.json();

          set((state) => ({
            myPostedJobs: state.myPostedJobs.map((j) =>
              j.id === id ? { ...j, status: job.status, updated_at: job.updated_at } : j
            ),
          }));
        } catch (error) {
          Sentry.captureException(new Error(`updateStatus error: ${error}`));
        }
      },

      // ── deleteJob ────────────────────────────────────────────────────────
      deleteJob: async (id: string) => {
        try {
          const token = await firebaseAuth.getIdToken();
          if (!token) throw new Error('Not authenticated');

          const response = await apiFetch(`${getApiUrl()}/api/jobs/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) throw new Error('Failed to delete job');

          // Optimistic local removal
          set((state) => ({
            myPostedJobs: state.myPostedJobs.filter((j) => j.id !== id),
          }));
        } catch (error) {
          Sentry.captureException(new Error(`deleteJob error: ${error}`));
        }
      },

      // ── createJob ────────────────────────────────────────────────────────
      createJob: async (jobData: any) => {
        const token = await firebaseAuth.getIdToken();
        if (!token) throw new Error('Not authenticated');

        const response = await apiFetch(`${getApiUrl()}/api/jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(jobData),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          let errMsg = errData.message || errData.error || 'Failed to post job';
          if (errData.details && Array.isArray(errData.details)) {
            errMsg += ': ' + errData.details.map((d: any) => d.message).join(', ');
          }
          const err = new Error(errMsg);
          Sentry.captureException(err);
          throw err;
        }

        const { job } = await response.json();

        // Prepend & reset the cooldown so My Jobs refreshes properly
        set((state) => ({
          myPostedJobs: [job, ...state.myPostedJobs],
          _lastFetchedAt: Date.now(),
        }));

        return job;
      },
    }),
    {
      name: 'job-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        myPostedJobs: state.myPostedJobs,
        cachedFeed: state.cachedFeed,
        _lastFetchedAt: state._lastFetchedAt,
      }),
    }
  )
);
