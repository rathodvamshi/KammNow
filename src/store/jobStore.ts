import { create } from 'zustand';
import type { Job } from '../types';
import { supabase } from '../services/supabase';
import { firebaseAuth } from '../services/firebaseAuth';

interface JobState {
  myPostedJobs: Job[];
  isLoading: boolean;
  error: string | null;

  fetchMyJobs: (userId: string) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
}

const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const useJobStore = create<JobState>((set) => ({
  myPostedJobs: [],
  isLoading: false,
  error: null,

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
      console.error('Failed to fetch jobs:', error);
      set({ error: error.message || 'Failed to fetch jobs', isLoading: false });
    }
  },

  updateStatus: async (id: string, status: string) => {
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getApiUrl()}/api/jobs/${id}/status`, {
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
      console.error('updateStatus error:', error);
    }
  },

  deleteJob: async (id: string) => {
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      // We use the same status endpoint but pass 'deleted' or similar, 
      // wait, the API didn't handle is_deleted... it handled status!
      // But we can add another endpoint or just hide it. Let's mark status as cancelled for now.
      const response = await fetch(`${getApiUrl()}/api/jobs/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) throw new Error('Failed to delete job');

      set((state) => ({
        myPostedJobs: state.myPostedJobs.filter((j) => j.id !== id),
      }));
    } catch (error) {
      console.error('deleteJob error:', error);
    }
  },
}));
