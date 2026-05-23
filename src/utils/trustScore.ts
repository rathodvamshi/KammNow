import type { User } from '../types';

export const calculateTrustScore = (user: User | null): number => {
  if (!user) return 0;
  
  let score = 50; // Base score
  
  // Rating weight: up to 30 points
  const rating = Math.max(user.worker_rating || 0, user.employer_rating || 0);
  if (rating > 0) {
     score += (rating / 5) * 30;
  }
  
  // Jobs completed weight: up to 10 points
  if (user.jobs_completed) {
     score += Math.min(10, user.jobs_completed);
  }
  
  // Verification: 10 points
  if (user.is_verified) {
     score += 10;
  }
  
  // Reports penalty: subtract 10 per report
  if (user.reports) {
     score -= (user.reports * 10);
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const generateBadges = (user: User | null): string[] => {
  if (!user) return [];

  const badges: string[] = [];
  const score = calculateTrustScore(user);
  
  if (user.is_verified) badges.push('🛡 Verified User');
  
  const rating = Math.max(user.worker_rating || 0, user.employer_rating || 0);
  if (rating >= 4.8) badges.push('🌟 Top Rated');
  
  if (score >= 90) badges.push('🔥 Trusted Worker');
  if (user.jobs_completed && user.jobs_completed >= 50) badges.push('💼 Professional');
  if (user.jobs_completed && user.jobs_completed >= 100) badges.push('🏆 Elite Provider');
  if (user.response_rate && user.response_rate >= 95) badges.push('⚡ Fast Responder');
  
  return badges;
};

export const getTrustScoreColor = (score: number): string => {
  if (score >= 90) return '#10B981'; // Colors.green
  if (score >= 70) return '#F59E0B'; // Colors.gold
  return '#EF4444'; // Colors.red
};
