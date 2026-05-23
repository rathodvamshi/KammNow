import { Job, User } from '../types';
import { supabase } from './supabase';
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
  maxDistance?: number;
  searchTerm?: string;
}

export const matchingEngine = {
  getRecommendations: async (params: MatchingParams): Promise<(Job & { matchScore: number, distance_km: number })[]> => {
    const { user, location, category, filters, maxDistance = 50, searchTerm } = params;

    // Fetch jobs from Supabase instead of MOCK_JOBS
    // In a true production app with millions of jobs, this entire logic should be an RPC function in Postgres using PostGIS and pg_trgm.
    // For now, we fetch a limited batch of active jobs and rank them in JS.
    let query = supabase
      .from('jobs')
      .select(`
        *,
        provider:users(*),
        location:user_location(*)
      `)
      .eq('status', 'active')
      .eq('is_deleted', false)
      .limit(100);

    if (category && category !== 'all' && category !== 'urgent') {
       // Wait, categories are UUIDs now, but if category is a string name, we might need to join.
       // Assuming category is still passed as string for now, we'll filter in JS if needed.
    }

    const { data: rawJobs, error } = await query;
    
    if (error) {
      console.error('Error fetching jobs for matching:', error);
      return [];
    }

    // Map DB schema to frontend expected format
    const jobs = (rawJobs || []).map((dbJob: any) => ({
      id: dbJob.id,
      title: dbJob.title,
      description: dbJob.description,
      poster_id: dbJob.provider_id,
      poster_name: dbJob.provider?.name || 'Unknown',
      poster_avatar: dbJob.provider?.profile_image || 'https://i.pravatar.cc/150',
      category: dbJob.category_id || 'general', // We need to handle categories properly later
      pay_amount: dbJob.salary || 0,
      pay_type: dbJob.salary_type || 'fixed',
      location_name: dbJob.location?.address || dbJob.location?.city || 'Unknown Location',
      location_lat: dbJob.location?.latitude || 0,
      location_lng: dbJob.location?.longitude || 0,
      status: dbJob.status,
      created_at: dbJob.created_at,
      employer_trust_score: dbJob.provider?.trust_score || 80,
      employer_reports: dbJob.provider?.reports || 0,
      is_urgent: false,
    }));

    const filteredJobs = jobs.filter((job: any) => {
      if (searchTerm && searchTerm.trim().length > 0) {
        const searchVector = (job.title + ' ' + job.description).toLowerCase();
        const terms = searchTerm.toLowerCase().split(' ').filter(t => t.trim().length > 0);
        const matchesQuery = terms.every(term => searchVector.includes(term));
        if (!matchesQuery) return false;
      }

      if ((job.employer_trust_score ?? 100) < 30) return false;
      if ((job.employer_reports ?? 0) >= 3) return false;

      if (category && category !== 'all' && category !== 'urgent') {
        // Basic category text match since we haven't mapped UUIDs perfectly yet
        // In reality, frontend passes category id.
      }
      if (category === 'urgent' && !job.is_urgent) return false;

      if (location?.city) {
        if (!job.location_name.toLowerCase().includes(location.city.toLowerCase())) return false;
      }

      if (filters?.min_pay && job.pay_amount < filters.min_pay) return false;

      return true;
    });

    let processedJobs = filteredJobs.map((job: any) => {
      let score = 0;
      let distance = 999;
      
      if (location && job.location_lat && job.location_lng) {
        distance = haversineDistance(location.latitude, location.longitude, job.location_lat, job.location_lng);
      }

      const userSkills = user.skills?.map(s => s.toLowerCase()) || [];
      const jobCategory = (job.category || '').toLowerCase();
      const jobTitle = job.title.toLowerCase();
      
      const hasSkillMatch = userSkills.some(skill => 
        jobCategory.includes(skill) || skill.includes(jobCategory) || jobTitle.includes(skill)
      );
      
      if (hasSkillMatch) score += 40;

      if (distance <= 5) score += 30;
      else if (distance <= 15) score += 15;

      if (user.expected_salary && user.preferred_pay_type === job.pay_type) {
        if (job.pay_amount >= user.expected_salary) score += 20;
        else if (job.pay_amount >= (user.expected_salary * 0.8)) score += 10;
      } else if (!user.expected_salary) {
        score += 10;
      }

      if (user.preferred_pay_type === job.pay_type) score += 10;
      
      const trustScore = job.employer_trust_score || 0;

      let ftsRankScore = 0;
      if (searchTerm && searchTerm.trim().length > 0) {
        const terms = searchTerm.toLowerCase().split(' ').filter(t => t.trim().length > 0);
        terms.forEach(term => {
          if (job.title.toLowerCase().includes(term)) ftsRankScore += 50;
          else if (job.description.toLowerCase().includes(term)) ftsRankScore += 20;
        });
      }
      
      const finalCompositeScore = (score * 0.4) + (trustScore * 0.6) + ftsRankScore;

      return {
        ...job,
        distance_km: distance,
        matchScore: finalCompositeScore,
      };
    });

    if (location) {
        processedJobs = processedJobs.filter(job => job.distance_km <= maxDistance);
    }

    processedJobs.sort((a, b) => {
      if (filters?.sort_by === 'pay_high_to_low') return b.pay_amount - a.pay_amount;
      if (filters?.sort_by === 'distance') return a.distance_km - b.distance_km;
      if (filters?.sort_by === 'date_posted') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return b.matchScore - a.matchScore;
    });

    return processedJobs.slice(0, 20);
  },
};
