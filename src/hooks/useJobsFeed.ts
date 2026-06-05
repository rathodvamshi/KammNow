import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { getApiUrl } from '../config';
import { firebaseAuth } from '../services/firebaseAuth';
import type { Job } from '../types';

interface FeedResponse {
  success: boolean;
  data: Job[];
  source: string;
}

export const useJobsFeed = (lat: number | null, lon: number | null) => {
  return useInfiniteQuery({
    queryKey: ['jobsFeed', lat, lon],
    initialPageParam: null,
    queryFn: async ({ pageParam = null, signal }: { pageParam: string | null, signal?: AbortSignal }) => {
      if (!lat || !lon) return { data: [], nextCursor: null };

      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      let url = `${getApiUrl()}/api/jobs/feed?lat=${lat}&lon=${lon}`;
      if (pageParam) {
        url += `&cursor=${pageParam}`;
      }

      const res = await apiFetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      
      const json: FeedResponse = await res.json();
      if (!json.success) {
        throw new Error('Failed to fetch feed');
      }

      const jobs = json.data || [];
      const nextCursor = jobs.length === 20 ? jobs[jobs.length - 1].created_at : null;

      return {
        data: jobs,
        nextCursor
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!lat && !!lon,
  });
};
