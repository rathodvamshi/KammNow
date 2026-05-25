import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import type { Job } from '../types';
import { supabase } from '../services/supabase';
import { firebaseAuth } from '../services/firebaseAuth';
import { apiFetch } from '../utils/apiClient';

interface JobState {
  myPostedJobs: Job[];
  isLoading: boolean;
  error: string | null;

  fetchMyJobs: (userId: string) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  createJob: (jobData: any) => Promise<Job>;
  
  cachedFeed: any[];
  setCachedFeed: (feed: any[]) => void;
}

const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const useJobStore = create<JobState>()(
  persist(
    (set) => ({
  myPostedJobs: [],
  cachedFeed: [],
  isLoading: false,
  error: null,

  setCachedFeed: (feed: any[]) => set({ cachedFeed: feed }),

  fetchMyJobs: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('provider_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      set({ myPostedJobs: data || [], isLoading: false });
    } catch (error: any) {
      Sentry.captureException(new Error(`${'Failed to fetch jobs:'} ${error}`));
      set({ error: error.message || 'Failed to fetch jobs', isLoading: false });
    }
  },

  updateStatus: async (id: string, status: string) => {
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await apiFetch(`${getApiUrl()}/api/jobs/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update status on backend');
      
      const { job } = await response.json();

      set((state) => ({
        myPostedJobs: state.myPostedJobs.map((j) =>
          j.id === id ? { ...j, status: job.status, updated_at: job.updated_at } : j
        ),
      }));
    } catch (error) {
      Sentry.captureException(new Error(`${'updateStatus error:'} ${error}`));
    }
  },

  deleteJob: async (id: string) => {
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await apiFetch(`${getApiUrl()}/api/jobs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete job');

      set((state) => ({
        myPostedJobs: state.myPostedJobs.filter((j) => j.id !== id),
      }));
    } catch (error) {
      Sentry.captureException(new Error(`${'deleteJob error:'} ${error}`));
    }
  },

  createJob: async (jobData: any) => {
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      // jobData shape (set by post.tsx handlePost):
      //   title, description, category_id, job_type,
      //   salary, salary_type, experience_required,
      //   latitude, longitude, location_name, full_address,
      //   required_skills[], is_urgent,
      //   gender_preference, contact_method, quantity_total
      const response = await apiFetch(`${getApiUrl()}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jobData)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to post job');
      }

      const { job } = await response.json();
      
      set((state) => ({
        myPostedJobs: [job, ...state.myPostedJobs]
      }));
      
      return job;
    } catch (error: any) {
      Sentry.captureException(new Error(`${'createJob error:'} ${error}`));
      throw error;
    }
  },
    }),
    {
      name: 'job-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
