import { format, parseISO, isValid } from 'date-fns';

/**
 * Formats a JS Date or ISO string into a strict API-ready ISO 8601 string.
 * Example output: "2026-05-27T00:00:00.000Z"
 * @param date - Date object, or date string
 * @returns ISO string or null if invalid
 */
export const formatForApi = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return null;
    return d.toISOString();
  } catch (error) {
    return null;
  }
};

/**
 * Formats a JS Date or ISO string for user display.
 * Example output: "27 May 2026"
 * @param date - Date object, or date string
 * @returns Human readable string
 */
export const formatForDisplay = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return '';
    return format(d, 'dd MMM yyyy');
  } catch (error) {
    return '';
  }
};

/**
 * Formats a relative time string (e.g., "2 hours ago").
 * Useful for feeds and chat.
 * @param date - ISO string or Date
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(d)) return '';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return format(d, 'dd MMM yyyy');
  } catch (error) {
    return '';
  }
};
