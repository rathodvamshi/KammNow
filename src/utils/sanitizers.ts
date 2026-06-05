import type { Job, Application } from '../types';

/**
 * Sanitizes an array of jobs from the backend or local storage.
 * - Removes null/undefined items
 * - Ensures critical fields have safe default values
 * - Normalizes boolean flags
 */
export function sanitizeJobs(jobs: any[] = []): Job[] {
  if (!Array.isArray(jobs)) return [];
  
  return jobs
    .filter(job => job && typeof job === 'object')
    .map(job => ({
      ...job,
      id: job.id || '',
      title: job.title || 'Untitled Job',
      status: job.status || 'draft',
      is_deleted: Boolean(job.is_deleted),
      pay_amount: job.pay_amount || 0,
      quantity_hired: job.quantity_hired || 0,
      quantity_total: job.quantity_total || 0,
      applicants_count: job.applicants_count || 0,
      category: job.category || 'other',
    })) as Job[];
}

/**
 * Sanitizes an array of applications from the backend or local storage.
 * - Removes null/undefined items
 * - Ensures safe nested objects
 */
export function sanitizeApplications(applications: any[] = []): Application[] {
  if (!Array.isArray(applications)) return [];

  return applications
    .filter(app => app && typeof app === 'object')
    .map(app => ({
      ...app,
      id: app.id || '',
      job_id: app.job_id || '',
      applicant_id: app.applicant_id || '',
      status: app.status || 'pending',
      job: app.job && typeof app.job === 'object' ? {
        ...app.job,
        title: app.job.title || 'Untitled Job',
        poster_name: app.job.poster_name || 'Provider',
        pay_amount: app.job.pay_amount || 0,
      } : null,
      applicant: app.applicant && typeof app.applicant === 'object' ? app.applicant : null,
    })) as Application[];
}
