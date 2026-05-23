// KaamNow — TypeScript Types

// ============ USER ============
export interface User {
  id: string;
  phone: string;
  firebase_uid: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  skills: string[];
  language: 'en' | 'hi' | 'te';
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  jobs_completed: number;
  jobs_posted: number;
  worker_rating: number;
  employer_rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_blocked: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
  role?: 'provider' | 'seeker' | 'employer';

  // Job Preferences (For Matching Algorithm)
  expected_salary?: number;
  preferred_pay_type?: PayType;

  // Trust & Platform Safety Profile
  rating?: number;
  completed_jobs?: number;
  reports?: number;
  attendance?: number;     // Worker trust signal
  response_rate?: number;  // Employer trust signal
  trust_score?: number;    // Pre-calculated global Trust score
}

// ============ JOB ============
export type JobCategory =
  | 'delivery'
  | 'driver'
  | 'warehouse'
  | 'construction'
  | 'cleaning'
  | 'cooking'
  | 'security'
  | 'shop_helper'
  | 'office_assistant'
  | 'electrician'
  | 'plumber'
  | 'mechanic'
  | 'painter'
  | 'carpenter'
  | 'event_staff'
  | 'hotel_staff'
  | 'restaurant_staff'
  | 'factory_worker'
  | 'household_work'
  | 'gardening'
  | 'caregiver'
  | 'technician'
  | 'sales_promoter'
  | 'loading_unloading'
  | 'other';

export type PayType = 'hour' | 'day' | 'month';
export type JobStatus = 'live' | 'paused' | 'filled' | 'deleted';
export type WorkType = 'full_time' | 'part_time' | 'one_time' | 'shift';
export type SkillLevel = 'beginner' | 'skilled' | 'heavy' | 'any';
export type PaymentSchedule = 'daily' | 'weekly' | 'monthly';

export interface Job {
  id: string;
  poster_id: string;
  title: string;
  category: JobCategory;
  description: string;
  pay_amount: number;
  pay_type: PayType;
  hours_per_day: number;
  quantity_total: number;
  quantity_hired: number;
  location_lat: number;
  location_lng: number;
  location_name: string;
  is_urgent: boolean;
  show_phone: boolean;
  status: JobStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;

  // ── Schedule ──
  work_start_date?: string;   // "2026-08-10" or "Today"
  work_end_date?: string;     // "2026-08-15" or "Ongoing"
  work_start_time?: string;   // "09:00 AM"
  work_end_time?: string;     // "06:00 PM"
  duration_text?: string;     // "3 Days", "Ongoing", "1 Day"

  // ── Work classification ──
  work_type?: WorkType;
  skill_level?: SkillLevel;
  required_skills?: string[];
  gender_preference?: 'male' | 'female' | 'any';
  joining_date?: string;

  // ── Pay & Benefits ──
  payment_schedule?: PaymentSchedule;
  food_included?: boolean;
  stay_included?: boolean;
  travel_allowance?: boolean;
  same_day_payment?: boolean;
  overtime_available?: boolean;
  salary_negotiable?: boolean;
  pf_esi_included?: boolean;

  // ── Communication & Visibility ──
  language_pref?: string;     // "Telugu, Hindi"
  contact_phone?: string;     // shown only if show_phone = true
  contact_method?: 'in_app_chat' | 'phone_call' | 'whatsapp';
  visibility?: 'public' | 'private';
  experience_required?: string;
  working_days_per_week?: number;

  // ── Joined fields from API ──
  poster_name?: string;
  poster_rating?: number;
  poster_avatar?: string | null;

  // ── Trust & Ranking Algorithm (Platform Safety) ──
  employer_trust_score?: number; // Pre-calculated trust score from database
  employer_completed_jobs?: number;
  employer_verified?: boolean;
  employer_reports?: number;
  employer_response_rate?: number;

  // ── Search Optimization (FTS) ──
  search_vector?: string; // Pre-computed PostgreSQL Full Text Search vector

  distance_km?: number;
}

export interface JobWithPoster extends Job {
  poster: User;
}

// ============ CHAT ============
export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  status: MessageStatus;
  created_at: string;
  attachments?: string[];
}

// ============ REVIEW / TRUST ============
export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  target_user_id: string;
  rating: number; // 1 to 5
  review: string;
  created_at: string;
}

// ============ APPLICATION ============
export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'cancellation_requested'
  | 'completed'
  | 'withdrawn';

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  employer_id: string;
  description: string | null;
  voice_url: string | null;
  status: ApplicationStatus;
  applied_at: string;
  responded_at: string | null;
  completed_at: string | null;
  // Joined
  job?: Job;
  applicant?: User;
  employer?: User;
}

// ============ RATING ============
export type RatingType = 'worker' | 'employer';

export interface Rating {
  id: string;
  application_id: string;
  rater_id: string;
  ratee_id: string;
  rating_type: RatingType;
  stars: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  review_text: string | null;
  is_deleted: boolean;
  is_reported: boolean;
  created_at: string;
  rater?: User;
}

// ============ NOTIFICATION ============
export type NotificationType =
  | 'new_application'
  | 'app_accepted'
  | 'app_rejected'
  | 'rate_reminder'
  | 'job_near_you'
  | 'slot_filled'
  | 'app_withdrawn';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
}

// ============ API RESPONSES ============
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ============ FORMS ============
export interface PostJobForm {
  title: string;
  category: JobCategory;
  pay_amount: number;
  pay_type: PayType;
  hours_per_day: number;
  quantity_total: number;
  description: string;
  location_lat: number;
  location_lng: number;
  location_name: string;
  is_urgent: boolean;
  show_phone: boolean;
  duration_text?: string;
  work_start_date?: string;
  work_end_date?: string;
  work_start_time?: string;
  work_end_time?: string;
  work_type?: WorkType;
  skill_level?: SkillLevel;
  payment_schedule?: PaymentSchedule;
  food_included?: boolean;
  stay_included?: boolean;
  travel_allowance?: boolean;
  language_pref?: string;
  required_skills?: string[];
  gender_preference?: 'male' | 'female' | 'any';
  joining_date?: string;
  same_day_payment?: boolean;
  overtime_available?: boolean;
  salary_negotiable?: boolean;
  pf_esi_included?: boolean;
  contact_method?: 'in_app_chat' | 'phone_call' | 'whatsapp';
  visibility?: 'public' | 'private';
  experience_required?: string;
  working_days_per_week?: number;
}

export interface ProfileForm {
  name: string;
  age: number;
  bio?: string;
  skills: string[];
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
}

export interface RatingForm {
  application_id: string;
  stars: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  review_text?: string;
}

// ============ FILTERS ============
export interface JobFilters {
  lat?: number;
  lng?: number;
  page: number;
  limit: number;
  category?: JobCategory | 'all';
  sort: 'distance' | 'pay' | 'recent';
  search?: string;
}

// ============ LOCATION ============
export interface LocationData {
  lat: number;
  lng: number;
  name?: string;
}

// ============ FEEDBACK ============
export interface Feedback {
  id: string;
  rating: number;
  reviewText: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  reviewerRole: 'provider' | 'seeker';
  receiverId: string;
  jobId?: string;
  jobTitle?: string;
  reviewImages?: string[];
  tags: string[];
  helpfulCount: number;
  createdAt: string;
}
