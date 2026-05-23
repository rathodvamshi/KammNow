import { create } from 'zustand';
import type { Application, ApplicationStatus, Job } from '../types';
import { supabase } from '../services/supabase';
import { firebaseAuth } from '../services/firebaseAuth';

interface ApplicationState {
  myApplications: Application[];
  receivedApplications: Application[];
  isLoading: boolean;
  error: string | null;

  fetchMyApplications: (userId: string) => Promise<void>;
  fetchReceivedApplications: (userId: string) => Promise<void>;
  applyToJob: (job: Job, applicantId: string) => Promise<void>;
  cancelApplication: (applicationId: string) => Promise<void>;
  requestCancellation: (applicationId: string) => Promise<void>;
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => Promise<void>;
}

const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  myApplications: [],
  receivedApplications: [],
  isLoading: false,
  error: null,

  fetchMyApplications: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*, job:jobs(*)')
        .eq('seeker_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ myApplications: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch my applications:', error);
      set({ error: error.message || 'Failed to fetch applications', isLoading: false });
    }
  },

  fetchReceivedApplications: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Using a nested query to find applications where the job's provider_id is the user
      // Note: Supabase RLS is configured to allow this read.
      const { data, error } = await supabase
        .from('job_applications')
        .select('*, job:jobs!inner(*)')
        .eq('jobs.provider_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ receivedApplications: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch received applications:', error);
      set({ error: error.message || 'Failed to fetch received applications', isLoading: false });
    }
  },

  applyToJob: async (job: Job, applicantId: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getApiUrl()}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: job.id })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to apply');
      }
      
      const { application } = await response.json();
      
      // Inject nested job for immediate UI state
      const newApp = { ...application, job };
      
      set((state) => ({
        myApplications: [newApp, ...state.myApplications],
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('applyToJob error:', error);
      set({ error: error.message || 'Failed to apply', isLoading: false });
    }
  },

  cancelApplication: async (applicationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getApiUrl()}/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) throw new Error('Failed to cancel');

      set((state) => ({
        myApplications: state.myApplications.map((app) => app.id === applicationId ? { ...app, status: 'cancelled' } : app),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('cancelApplication error:', error);
      set({ error: error.message || 'Failed to cancel', isLoading: false });
    }
  },

  requestCancellation: async (applicationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getApiUrl()}/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancellation_requested' })
      });

      if (!response.ok) throw new Error('Failed to request cancellation');

      set((state) => ({
        myApplications: state.myApplications.map((app) =>
          app.id === applicationId ? { ...app, status: 'cancellation_requested' } : app
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('requestCancellation error:', error);
      set({ error: error.message || 'Failed to request cancellation', isLoading: false });
    }
  },

  updateApplicationStatus: async (applicationId: string, status: ApplicationStatus) => {
    set({ isLoading: true, error: null });
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getApiUrl()}/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update status');

      set((state) => ({
        myApplications: state.myApplications.map((app) =>
          app.id === applicationId ? { ...app, status } : app
        ),
        receivedApplications: state.receivedApplications.map((app) =>
          app.id === applicationId ? { ...app, status } : app
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('updateApplicationStatus error:', error);
      set({ error: error.message || 'Failed to update status', isLoading: false });
    }
  },
}));
