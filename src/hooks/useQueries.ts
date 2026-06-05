import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { getApiUrl } from '../config';
import { firebaseAuth } from '../services/firebaseAuth';

export const useMyJobs = (userId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['myJobs', userId],
    queryFn: async ({ signal }) => {
      const token = await firebaseAuth.getIdToken();
      const res = await apiFetch(`${getApiUrl()}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!userId && enabled,
  });
};

export const useReceivedApplications = (userId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receivedApplications', userId],
    queryFn: async ({ signal }) => {
      const token = await firebaseAuth.getIdToken();
      const res = await apiFetch(`${getApiUrl()}/api/applications/received`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!userId && enabled,
  });
};

export const useMyApplications = (userId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['myApplications', userId],
    queryFn: async ({ signal }) => {
      const token = await firebaseAuth.getIdToken();
      const res = await apiFetch(`${getApiUrl()}/api/applications`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!userId && enabled,
  });
};
