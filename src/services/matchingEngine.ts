import { Job, User } from '../types';
import { MOCK_JOBS } from './mockData';
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
  maxDistance?: number; // Filter for Distance Filtering Algorithm
  searchTerm?: string;  // Emulating Full Text Search (FTS) queries
}

export const matchingEngine = {
  getRecommendations: async (params: MatchingParams): Promise<(Job & { matchScore: number, distance_km: number })[]> => {
    const { user, location, category, filters, maxDistance = 20, searchTerm } = params;

    // Simulate backend network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // STEP 1: HARD FILTERING & ANTI-SCAM (Database level emulation)
    // We only process jobs in the matching city, active status, and matching category.
    const filteredJobs = MOCK_JOBS.filter((job) => {
      if (job.status !== 'live') return false;

      // --- PostgreSQL FTS (Full Text Search) Emulation ---
      if (searchTerm && searchTerm.trim().length > 0) {
        // Assume backend pre-computes to_tsvector(title || ' ' || description || ' ' || category)
        const searchVector = job.search_vector || (job.title + ' ' + job.description + ' ' + job.category).toLowerCase();
        
        const terms = searchTerm.toLowerCase().split(' ').filter(t => t.trim().length > 0);
        const matchesQuery = terms.every(term => searchVector.includes(term));
        if (!matchesQuery) return false;
      }
      // --------------------------------------------------

      // --- TRUST & ANTI-SCAM FILTERS ---
      if ((job.employer_trust_score ?? 100) < 30) return false; // Hide drastically untrusted employers
      if ((job.employer_reports ?? 0) >= 3) return false; // Hide if user has heavy scam reports
      // ---------------------------------

      if (category && category !== 'all' && category !== 'urgent') {
        if (job.category !== category) return false;
      }
      
      if (category === 'urgent' && !job.is_urgent) return false;

      if (location?.city) {
        if (!job.location_name.toLowerCase().includes(location.city.toLowerCase())) return false;
      }

      if (filters?.min_pay && job.pay_amount < filters.min_pay) return false;

      return true;
    });

    // STEP 2 & 3: CALCULATE DISTANCE & SCORE & APPLY RANKING (In-Memory Processing)
    let processedJobs = filteredJobs.map((job) => {
      let score = 0;
      let distance = 999;
      
      if (location) {
        distance = haversineDistance(location.latitude, location.longitude, job.location_lat, job.location_lng);
      }

      const userSkills = user.skills?.map(s => s.toLowerCase()) || [];

      // 1. Skill Match (Weight: 40)
      const jobCategory = job.category.toLowerCase();
      const jobTitle = job.title.toLowerCase();
      
      const hasSkillMatch = userSkills.some(skill => 
        jobCategory.includes(skill) || skill.includes(jobCategory) || jobTitle.includes(skill)
      );
      
      if (hasSkillMatch) {
        score += 40;
      }

      // 2. Location Match (Weight: 30)
      if (distance <= 5) {
        score += 30; // Very close
      } else if (distance <= 15) {
        score += 15; // Driveable
      }

      // 3. Salary Match (Weight: 20)
      if (user.expected_salary && user.preferred_pay_type === job.pay_type) {
        if (job.pay_amount >= user.expected_salary) {
          score += 20;
        } else if (job.pay_amount >= (user.expected_salary * 0.8)) {
          score += 10;
        }
      } else if (!user.expected_salary) {
        score += 10;
      }

      // 4. Availability Match (Weight: 10)
      if (user.preferred_pay_type === job.pay_type) {
        score += 10;
      }
      
      // 5. Apply Ranking Trust Modifier (Platform Trust Signal)
      const trustScore = job.employer_trust_score || 0;

      // 6. PostgreSQL FTS Rank Boost (ts_rank emulation)
      let ftsRankScore = 0;
      if (searchTerm && searchTerm.trim().length > 0) {
        const terms = searchTerm.toLowerCase().split(' ').filter(t => t.trim().length > 0);
        terms.forEach(term => {
          if (job.title.toLowerCase().includes(term)) ftsRankScore += 50; // Exact match in title gets highest rank
          else if (job.description.toLowerCase().includes(term)) ftsRankScore += 20;
          else if (job.category.toLowerCase().includes(term)) ftsRankScore += 10;
        });
      }
      
      // We combine the personalized Match Score (max 100) with the Platform Trust Score (max 100)
      // and inject FTS rank boost if a search acts heavily.
      const finalCompositeScore = (score * 0.4) + (trustScore * 0.6) + ftsRankScore;

      return {
        ...job,
        distance_km: distance,
        matchScore: finalCompositeScore,
      };
    });

    // STEP 4: DISTANCE FILTERING (e.g. <= 20km)
    if (location) {
        processedJobs = processedJobs.filter(job => job.distance_km <= maxDistance);
    }

    // STEP 5: RANK & SORT BY TRUST + MATCH (or other selected sort)
    processedJobs.sort((a, b) => {
      if (filters?.sort_by === 'pay_high_to_low') {
         return b.pay_amount - a.pay_amount;
      } else if (filters?.sort_by === 'distance') {
         return a.distance_km - b.distance_km;
      } else if (filters?.sort_by === 'date_posted') {
         return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      // Default fallback: Sort by Composite Trust/Match Score (Highest first) per MVP Ranking guidelines
      return b.matchScore - a.matchScore;
    });

    // LIMIT RESULTS: Return top 20 jobs only to optimize response
    return processedJobs.slice(0, 20);
  },
};
