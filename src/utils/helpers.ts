// Utility functions for KaamNow

import type { PayType, JobCategory } from '../types';

/**
 * Haversine distance formula — returns distance in km between two GPS coordinates.
 * Optimized with early exit for same-point case.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (lat1 === lat2 && lng1 === lng2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display — "0.4 km" or "200 m" for very short distances
 */
export function formatDistance(km: number): string {
  if (km < 0.1) return `${Math.round(km * 1000)} m`;
  if (km < 1) return `${(km).toFixed(1)} km`;
  return `${km.toFixed(1)} km`;
}

/**
 * Format pay amount with rupee symbol and type
 */
export function formatPay(amount: number, type: PayType): string {
  const formatted = amount >= 1000
    ? `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`
    : `₹${amount}`;
  const typeStr = type === 'hour' ? '/hr' : type === 'day' ? '/day' : '/mo';
  return `${formatted}${typeStr}`;
}

/**
 * Format number to compact Indian style: 1200 → "1.2K", 100000 → "1L"
 */
export function formatCompact(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/**
 * Format relative time — "2 min ago", "1 hr ago", "3 days ago"
 */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

/**
 * Get initials from a name — "Ramesh Sharma" → "RS"
 */
export function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Category icon emoji for job categories
 */
export function getCategoryIcon(category: JobCategory): string {
  const map: Record<JobCategory, string> = {
    delivery: '🛵',
    events: '🎪',
    shop: '🏪',
    construction: '🏗️',
    restaurant: '🍽️',
    office: '🏢',
    cleaning: '🧹',
    security: '🛡️',
    driver: '🚗',
    tech: '💻',
    salon: '💇',
    tutor: '📚',
    others: '💼',
  };
  return map[category] ?? '💼';
}

/**
 * Category color scheme for job card icons
 */
export function getCategoryColor(
  category: JobCategory
): 'orange' | 'green' | 'blue' | 'gold' | 'red' | 'navy' {
  const map: Record<JobCategory, 'orange' | 'green' | 'blue' | 'gold' | 'red' | 'navy'> = {
    delivery: 'orange',
    events: 'green',
    shop: 'blue',
    construction: 'gold',
    restaurant: 'red',
    office: 'navy',
    cleaning: 'blue',
    security: 'gold',
    driver: 'orange',
    tech: 'blue',
    salon: 'green',
    tutor: 'gold',
    others: 'navy',
  };
  return map[category] ?? 'navy';
}

/**
 * Calculate total daily pay from hourly rate × hours
 */
export function calcTotalPay(amount: number, type: PayType, hours: number): number {
  if (type === 'hour') return amount * hours;
  if (type === 'day') return amount;
  return Math.round(amount / 26); // ~26 working days per month
}

/**
 * Slots remaining display text
 */
export function slotsText(hired: number, total: number): string {
  const remaining = total - hired;
  if (remaining <= 0) return 'All slots filled';
  return `${hired} of ${total} filled • ${remaining} left`;
}

/**
 * Validate Indian mobile number (10 digits, no country code)
 */
export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}

/**
 * Avatar background color based on name initial
 */
export function avatarColor(name: string | null): string {
  const colors = [
    '#FF6B00', '#00875A', '#1A2340', '#1565C0',
    '#F0A500', '#E53935', '#6A1B9A', '#00838F',
  ];
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}
