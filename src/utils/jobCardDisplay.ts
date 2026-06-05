/**
 * Seeker job card — display model derived from provider post fields.
 * Keeps JobCard presentational; all copy/format logic lives here.
 */

import type { Ionicons } from '@expo/vector-icons';
import type { Job, JobCategory, PayType, PaymentSchedule, SkillLevel, WorkType } from '../types';
import { formatDistance, formatRelativeTime, getCategoryIcon } from './helpers';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface JobCardBenefit {
  icon: IoniconName;
  label: string;
  tone: 'saffron' | 'green' | 'blue' | 'gold';
}

export interface JobCardFact {
  icon: IoniconName;
  label: string;
}

export interface JobCardDisplay {
  categoryLabel: string;
  categoryEmoji: string;
  payPrimary: string;
  payPeriod: string;
  payHint?: string;
  locationLine: string;
  shiftLine: string;
  scheduleLine: string;
  openingsLine: string;
  facts: JobCardFact[];
  skills: string[];
  skillsOverflow: number;
  descriptionPreview: string | null;
  benefits: JobCardBenefit[];
  benefitsOverflow: number;
  showDetailsHint: boolean;
  employerName: string;
  employerMeta: string;
  postedAgo: string;
  slotsRemaining: number;
  slotsUrgency: string | null;
  fillPercent: number;
  isFull: boolean;
  showCall: boolean;
  isUrgent: boolean;
  isVerified: boolean;
  payTotalInfo?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  distanceText?: string;
  ratingValue?: number;
}

const CATEGORY_LABELS: Record<JobCategory, string> = {
  delivery: 'Delivery',
  driver: 'Driver',
  warehouse: 'Warehouse',
  construction: 'Construction',
  cleaning: 'Cleaning',
  cooking: 'Cooking',
  security: 'Security',
  shop_helper: 'Shop Helper',
  office_assistant: 'Office Assistant',
  electrician: 'Electrician',
  plumber: 'Plumber',
  mechanic: 'Mechanic',
  painter: 'Painter',
  carpenter: 'Carpenter',
  event_staff: 'Event Staff',
  hotel_staff: 'Hotel Staff',
  restaurant_staff: 'Restaurant',
  factory_worker: 'Factory',
  household_work: 'Household',
  gardening: 'Gardening',
  caregiver: 'Caregiver',
  technician: 'Technician',
  sales_promoter: 'Sales',
  loading_unloading: 'Loading',
  other: 'Other',
};

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  one_time: 'One-time',
  shift: 'Shift',
};

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Fresher OK',
  skilled: 'Skilled',
  heavy: 'Heavy work',
  any: 'Any level',
};

const PAY_PERIOD: Record<PayType, string> = {
  hour: '/hr',
  day: '/day',
  month: '/mo',
};

const PAYMENT_SCHEDULE_LABELS: Record<PaymentSchedule, string> = {
  daily: 'Daily pay',
  weekly: 'Weekly pay',
  monthly: 'Monthly pay',
};

function formatPayAmount(amount: number | null | undefined): string {
  if (amount == null) return 'N/A';
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `₹${amount}`;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function formatShift(start?: string, end?: string): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  return 'Flexible timing';
}

function formatSchedule(job: Job): string {
  if (job.duration_text) return job.duration_text;
  if (job.work_type === 'one_time' && job.work_start_date) return `Starts ${job.work_start_date}`;
  if (job.joining_date) return `Join ${job.joining_date}`;
  if (job.work_start_date && job.work_end_date && job.work_start_date !== job.work_end_date) {
    return `${job.work_start_date} – ${job.work_end_date}`;
  }
  if (job.work_start_date) return `From ${job.work_start_date}`;
  return 'Schedule shared on apply';
}

function buildLocationLine(job: Job): string {
  const area = job.location_name?.trim();
  if (job.distance_km != null && area) {
    return `${formatDistance(job.distance_km)} · ${truncate(area, 36)}`;
  }
  if (job.distance_km != null) return formatDistance(job.distance_km);
  return area ? truncate(area, 42) : 'Location on apply';
}

function buildPay(job: Job): { primary: string; period: string; hint?: string } {
  const primary = formatPayAmount(job.pay_amount);
  const period = PAY_PERIOD[job.pay_type];
  const hints: string[] = [];
  if (job.salary_negotiable) hints.push('Negotiable');
  if (job.pay_type === 'hour' && job.hours_per_day > 0) {
    hints.push(`~${job.hours_per_day}h shift`);
  }
  if (job.pay_type === 'month' && job.working_days_per_week) {
    hints.push(`${job.working_days_per_week} days/wk`);
  }
  return { primary, period, hint: hints.length ? hints.join(' · ') : undefined };
}

function buildFacts(job: Job): JobCardFact[] {
  const facts: JobCardFact[] = [];

  if (job.experience_required) {
    facts.push({ icon: 'ribbon-outline', label: truncate(job.experience_required, 18) });
  } else if (job.skill_level) {
    facts.push({ icon: 'fitness-outline', label: SKILL_LEVEL_LABELS[job.skill_level] });
  }

  if (job.work_type) {
    facts.push({ icon: 'briefcase-outline', label: WORK_TYPE_LABELS[job.work_type] });
  }

  const remaining = job.quantity_total - job.quantity_hired;
  facts.push({
    icon: 'people-outline',
    label: remaining > 0 ? `${remaining} opening${remaining === 1 ? '' : 's'}` : 'Filled',
  });

  if (job.gender_preference && job.gender_preference !== 'any') {
    const g = job.gender_preference === 'male' ? 'Men only' : 'Women only';
    facts.push({ icon: 'person-outline', label: g });
  }

  if (job.language_pref) {
    facts.push({ icon: 'language-outline', label: truncate(job.language_pref, 16) });
  }

  return facts.slice(0, 4);
}

export function buildBenefits(job: Job): JobCardBenefit[] {
  const perks: JobCardBenefit[] = [];

  if (job.same_day_payment) {
    perks.push({ icon: 'flash-outline', label: 'Same-day pay', tone: 'gold' });
  }
  if (job.payment_schedule) {
    perks.push({
      icon: 'wallet-outline',
      label: PAYMENT_SCHEDULE_LABELS[job.payment_schedule],
      tone: 'green',
    });
  }
  if (job.food_included) perks.push({ icon: 'restaurant-outline', label: 'Food', tone: 'saffron' });
  if (job.stay_included) perks.push({ icon: 'bed-outline', label: 'Stay', tone: 'blue' });
  if (job.travel_allowance) perks.push({ icon: 'bus-outline', label: 'Travel', tone: 'blue' });
  if (job.overtime_available) perks.push({ icon: 'time-outline', label: 'OT pay', tone: 'gold' });
  if (job.pf_esi_included) perks.push({ icon: 'shield-checkmark-outline', label: 'PF/ESI', tone: 'green' });

  return perks.slice(0, 5);
}

function buildEmployerMeta(job: Job): string {
  const parts: string[] = [];
  const rating = job.poster_rating;
  if (rating != null && rating > 0) parts.push(`★ ${Number(rating).toFixed(1)}`);
  const completed = job.employer_completed_jobs ?? 0;
  if (completed > 0) parts.push(`${completed} gig${completed === 1 ? '' : 's'} posted`);
  else parts.push('New employer');
  const response = job.employer_response_rate;
  if (response != null && response >= 70) parts.push(`${response}% replies`);
  return parts.join(' · ');
}

export function getCategoryLabel(category: JobCategory): string {
  return CATEGORY_LABELS[category] ?? 'Gig';
}

export function buildJobCardDisplay(job: Job): JobCardDisplay {
  const slotsRemaining = Math.max(0, job.quantity_total - job.quantity_hired);
  const isFull = slotsRemaining <= 0;
  const fillPercent = job.quantity_total > 0
    ? Math.min((job.quantity_hired / job.quantity_total) * 100, 100)
    : 0;

  const pay = buildPay(job);

  let slotsUrgency: string | null = null;
  if (!isFull) {
    if (slotsRemaining === 1) slotsUrgency = 'Last slot';
    else if (slotsRemaining <= 3) slotsUrgency = `${slotsRemaining} left`;
  }

  const skills = job.required_skills ?? [];
  const skillsShown = skills.slice(0, 3);
  const allBenefits = buildBenefits(job);

  let payTotalInfo: string | undefined;
  if (job.work_start_date && job.work_end_date && job.pay_type === 'day') {
    const d1 = new Date(job.work_start_date).getTime();
    const d2 = new Date(job.work_end_date).getTime();
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      const days = Math.floor((d2 - d1) / 86400000) + 1;
      const total = days * (job.pay_amount || 0);
      payTotalInfo = `For ${days} day${days > 1 ? 's' : ''} • Total ₹${total.toLocaleString('en-IN')}`;
    }
  } else if (job.duration_text && job.pay_type === 'day') {
    // Basic fallback if duration text starts with a number
    const match = job.duration_text.match(/^(\d+)\s*day/i);
    if (match) {
      const days = parseInt(match[1], 10);
      const total = days * (job.pay_amount || 0);
      payTotalInfo = `For ${days} day${days > 1 ? 's' : ''} • Total ₹${total.toLocaleString('en-IN')}`;
    }
  }

  const distanceText = job.distance_km != null 
    ? `${job.distance_km < 1 ? '<1' : Number(job.distance_km).toFixed(1)} km away` 
    : 'Location on apply';

  return {
    categoryLabel: getCategoryLabel(job.category),
    categoryEmoji: getCategoryIcon(job.category),
    payPrimary: pay.primary,
    payPeriod: pay.period,
    payHint: pay.hint,
    locationLine: buildLocationLine(job),
    shiftLine: formatShift(job.work_start_time, job.work_end_time),
    scheduleLine: formatSchedule(job),
    openingsLine: isFull
      ? 'All positions filled'
      : `${slotsRemaining} of ${job.quantity_total} open`,
    facts: buildFacts(job),
    skills: skillsShown,
    skillsOverflow: Math.max(0, skills.length - skillsShown.length),
    descriptionPreview: job.description?.trim()
      ? truncate(job.description, 100)
      : null,
    benefits: allBenefits.slice(0, 2),
    benefitsOverflow: Math.max(0, allBenefits.length - 2),
    showDetailsHint: true,
    employerName: job.poster_name ?? 'Employer',
    employerMeta: buildEmployerMeta(job),
    postedAgo: formatRelativeTime(job.created_at),
    slotsRemaining,
    slotsUrgency,
    fillPercent,
    isFull,
    showCall: Boolean(job.show_phone && job.contact_phone),
    isUrgent: job.is_urgent,
    isVerified: Boolean(job.employer_verified),
    payTotalInfo,
    startDate: job.work_start_date,
    endDate: job.work_end_date,
    startTime: job.work_start_time,
    endTime: job.work_end_time,
    distanceText,
    ratingValue: job.poster_rating,
  };
}
