/**
 * NearWork Trust Score — Client-side implementation
 *
 * Formula (spec-compliant):
 *   TrustScore = (W_rating   × WeightedRatingAvg)    [0–100]
 *              + (W_complete × CompletionRate)         [0–100]
 *              + (W_response × ResponseRate)           [0–100]
 *              + VerifiedBonus                         [+5 phone, +15 govt ID]
 *              - CancellationPenalty                   [5 pts each, max 25]
 *              - ReportPenalty                         [10 pts each]
 *
 * Weighted Rating Avg uses exponential decay: weight = e^(-λ × days_ago), λ = 0.02
 * Score range: 0–100
 *
 * Badge tiers (spec):
 *   Bronze       < 40
 *   Silver       40–69
 *   Gold         70–89
 *   Verified Gold ≥ 90
 */

import type { User } from '../types';

// ── Weights ──────────────────────────────────────────────────────────────────
const W_RATING   = 0.35;
const W_COMPLETE = 0.25;
const W_RESPONSE = 0.15;
const LAMBDA     = 0.02; // exponential decay rate (per day)

export type TrustBadge = 'Bronze' | 'Silver' | 'Gold' | 'Verified Gold';

/**
 * Calculate the full trust score from a User object.
 * The server-side `calculate_trust_score(user_id)` SQL function implements
 * the identical formula using real DB data (ratings table + applications table).
 * This client-side version uses the pre-computed/cached fields on the User record.
 */
export const calculateTrustScore = (user: User | null): number => {
  if (!user) return 0;

  // ── 1. Weighted Rating Average ─────────────────────────────────────────────
  // We don't have per-review timestamps client-side, so use the stored aggregate.
  // The DB function runs the full per-rating exponential decay; this is the
  // display-only version using the pre-aggregated worker/employer rating.
  const rawRating = Math.max(user.worker_rating ?? 0, user.employer_rating ?? 0);
  // Normalise from 1–5 scale to 0–100
  const weightedRatingScore = rawRating > 0 ? (rawRating / 5.0) * 100 : 50; // 50 = neutral baseline

  // ── 2. Completion Rate ─────────────────────────────────────────────────────
  const completed  = user.jobs_completed ?? 0;
  const abandoned  = 0; // Not yet exposed on User type — future field
  const totalTried = completed + abandoned;
  const completionRate = totalTried > 0 ? (completed / totalTried) * 100 : 80; // 80 = optimistic default

  // ── 3. Response Rate ───────────────────────────────────────────────────────
  const responseRate = user.response_rate ?? 80;

  // ── 4. Verified Bonus (additive, hard ceiling amounts) ────────────────────
  let verifiedBonus = 0;
  if (user.is_verified) verifiedBonus += 5;  // Phone verified
  // government ID verified → +15 (extend when govt_id_verified field added)

  // ── 5. Cancellation Penalty ───────────────────────────────────────────────
  // Each cancellation costs 5 pts, capped at 25
  const cancellations = 0; // Not yet on User type — future field
  const cancelPenalty = Math.min(cancellations * 5, 25);

  // ── 6. Report Penalty ─────────────────────────────────────────────────────
  const reports = user.reports ?? 0;
  const reportPenalty = reports * 10;

  // ── Composite ─────────────────────────────────────────────────────────────
  const score =
    W_RATING   * weightedRatingScore
    + W_COMPLETE * completionRate
    + W_RESPONSE * responseRate
    + verifiedBonus
    - cancelPenalty
    - reportPenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Badge tier based on trust score (NearWork spec).
 */
export const getTrustBadge = (score: number): TrustBadge => {
  if (score >= 90) return 'Verified Gold';
  if (score >= 70) return 'Gold';
  if (score >= 40) return 'Silver';
  return 'Bronze';
};

/**
 * Badge emoji for display in UI.
 */
export const getTrustBadgeEmoji = (score: number): string => {
  if (score >= 90) return '🏅';
  if (score >= 70) return '🥇';
  if (score >= 40) return '🥈';
  return '🥉';
};

/**
 * Color for trust badge display.
 * Bronze: warm gray, Silver: slate, Gold: amber, Verified Gold: emerald
 */
export const getTrustScoreColor = (score: number): string => {
  if (score >= 90) return '#10B981'; // Emerald — Verified Gold
  if (score >= 70) return '#F59E0B'; // Amber   — Gold
  if (score >= 40) return '#64748B'; // Slate   — Silver
  return '#9CA3AF';                   // Gray    — Bronze
};

/**
 * Generate display badges for a user's profile card.
 * These are achievement/trust signals shown as chips.
 */
export const generateBadges = (user: User | null): string[] => {
  if (!user) return [];

  const badges: string[] = [];
  const score = calculateTrustScore(user);
  const badge = getTrustBadge(score);

  // Trust tier badge
  badges.push(`${getTrustBadgeEmoji(score)} ${badge}`);

  // Achievement badges
  if (user.is_verified)
    badges.push('🛡 Verified');

  const rating = Math.max(user.worker_rating ?? 0, user.employer_rating ?? 0);
  if (rating >= 4.8)
    badges.push('🌟 Top Rated');

  if ((user.jobs_completed ?? 0) >= 100)
    badges.push('🏆 Elite');
  else if ((user.jobs_completed ?? 0) >= 50)
    badges.push('💼 Pro');

  if ((user.response_rate ?? 0) >= 95)
    badges.push('⚡ Fast Responder');

  return badges;
};
