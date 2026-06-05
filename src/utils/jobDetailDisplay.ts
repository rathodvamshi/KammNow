/**
 * Full job detail model — every field from provider post, grouped for seeker detail screen.
 */

import type { Ionicons } from '@expo/vector-icons';
import type { Job } from '../types';
import {
  buildJobCardDisplay,
  buildBenefits,
  getCategoryLabel,
  type JobCardBenefit,
} from './jobCardDisplay';
import { formatDistance, formatPay, formatRelativeTime } from './helpers';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface DetailRow {
  icon: IoniconName;
  label: string;
  value: string;
  positive?: boolean;
}

export interface JobDetailModel {
  card: ReturnType<typeof buildJobCardDisplay>;
  title: string;
  categoryLabel: string;
  payLine: string;
  paySub?: string;
  locationFull: string;
  distanceText?: string;
  postedAgo: string;
  description: string;
  scheduleRows: DetailRow[];
  payBenefitRows: DetailRow[];
  requirementRows: DetailRow[];
  workerRows: DetailRow[];
  allSkills: string[];
  allBenefits: JobCardBenefit[];
  contactMethod?: string;
  showPhone: boolean;
  employerStats: { label: string; value: string }[];
}

const CONTACT_LABELS: Record<string, string> = {
  in_app_chat: 'In-app chat',
  phone_call: 'Phone call',
  whatsapp: 'WhatsApp',
};

function row(
  icon: IoniconName,
  label: string,
  value: string,
  positive?: boolean,
): DetailRow {
  return { icon, label, value: value || '—', positive };
}

function yesNo(v?: boolean) {
  return v ? 'Yes' : 'No';
}

export function buildJobDetailModel(job: Job): JobDetailModel {
  const card = buildJobCardDisplay(job);
  const payLine = formatPay(job.pay_amount, job.pay_type);
  const paySub = [
    job.salary_negotiable ? 'Negotiable' : null,
    job.payment_schedule ? `Paid ${job.payment_schedule}` : null,
    job.same_day_payment ? 'Same-day payment' : null,
    job.pay_type === 'hour' && job.hours_per_day ? `${job.hours_per_day} hrs/day` : null,
    job.working_days_per_week ? `${job.working_days_per_week} days/week` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const scheduleRows: DetailRow[] = [
    row('time-outline', 'Shift', card.shiftLine),
    row('calendar-outline', 'Duration', card.scheduleLine),
    row('today-outline', 'Start', job.work_start_date ?? 'ASAP'),
    row('calendar-clear-outline', 'End', job.work_end_date ?? 'Ongoing'),
  ];
  if (job.joining_date) {
    scheduleRows.push(row('enter-outline', 'Joining', job.joining_date));
  }

  const payBenefitRows: DetailRow[] = [
    row('wallet-outline', 'Pay rate', payLine, true),
    row('cash-outline', 'Payout cycle', job.payment_schedule ? `Paid ${job.payment_schedule}` : 'As per agreement'),
    row('restaurant-outline', 'Food included', yesNo(job.food_included), job.food_included),
    row('bed-outline', 'Stay included', yesNo(job.stay_included), job.stay_included),
    row('bus-outline', 'Travel allowance', yesNo(job.travel_allowance), job.travel_allowance),
    row('flash-outline', 'Same-day pay', yesNo(job.same_day_payment), job.same_day_payment),
    row('time-outline', 'Overtime', yesNo(job.overtime_available), job.overtime_available),
    row('shield-checkmark-outline', 'PF / ESI', yesNo(job.pf_esi_included), job.pf_esi_included),
  ];

  const requirementRows: DetailRow[] = [];
  if (job.experience_required) {
    requirementRows.push(row('ribbon-outline', 'Experience', job.experience_required));
  }
  if (job.skill_level) {
    const lvl =
      job.skill_level === 'beginner'
        ? 'Fresher OK'
        : job.skill_level === 'skilled'
          ? 'Skilled worker'
          : job.skill_level === 'heavy'
            ? 'Heavy physical work'
            : 'Any skill level';
    requirementRows.push(row('fitness-outline', 'Skill level', lvl));
  }
  if (job.work_type) {
    const wt =
      job.work_type === 'full_time'
        ? 'Full-time'
        : job.work_type === 'part_time'
          ? 'Part-time'
          : job.work_type === 'one_time'
            ? 'One-time gig'
            : 'Shift based';
    requirementRows.push(row('briefcase-outline', 'Work type', wt));
  }
  if (job.gender_preference && job.gender_preference !== 'any') {
    requirementRows.push(
      row(
        'person-outline',
        'Gender',
        job.gender_preference === 'male' ? 'Men only' : 'Women only',
      ),
    );
  }
  if (job.language_pref) {
    requirementRows.push(row('language-outline', 'Languages', job.language_pref));
  }

  const workerRows: DetailRow[] = [
    row(
      'people-outline',
      'Workers needed',
      `${job.quantity_total} total · ${card.slotsRemaining} open`,
      card.slotsRemaining > 0,
    ),
    row(
      'checkmark-done-outline',
      'Already hired',
      `${job.quantity_hired} of ${job.quantity_total}`,
    ),
  ];

  if (job.contact_method) {
    workerRows.push(
      row(
        'chatbubbles-outline',
        'Contact via',
        CONTACT_LABELS[job.contact_method] ?? job.contact_method,
      ),
    );
  }

  const employerStats = [
    { label: 'Gigs posted', value: String(job.employer_completed_jobs ?? 0) },
    { label: 'Rating', value: `${job.poster_rating != null ? Number(job.poster_rating).toFixed(1) : 'New'}★` },
    {
      label: 'Replies',
      value: job.employer_response_rate != null ? `${job.employer_response_rate}%` : '—',
    },
    {
      label: 'Trust',
      value:
        (job.employer_trust_score ?? 0) >= 75
          ? 'High'
          : (job.employer_trust_score ?? 0) >= 50
            ? 'Good'
            : 'Building',
    },
  ];

  return {
    card,
    title: job.title,
    categoryLabel: getCategoryLabel(job.category),
    payLine,
    paySub: paySub || undefined,
    locationFull: job.location_name,
    distanceText:
      job.distance_km != null ? formatDistance(job.distance_km) : undefined,
    postedAgo: formatRelativeTime(job.created_at),
    description: job.description?.trim() || 'No description provided.',
    scheduleRows,
    payBenefitRows,
    requirementRows,
    workerRows,
    allSkills: job.required_skills ?? [],
    allBenefits: buildBenefits(job),
    contactMethod: job.contact_method
      ? CONTACT_LABELS[job.contact_method]
      : undefined,
    showPhone: card.showCall,
    employerStats,
  };
}
