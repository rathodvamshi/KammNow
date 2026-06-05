const { z } = require('zod');

// Schema for POST /api/jobs
const createJobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(30, "Description must be at least 30 characters"),
  salary: z.coerce.number().optional().nullable(),
  salary_type: z.enum(['hour', 'day', 'month']).optional().nullable(),
  job_type: z.enum(['hour', 'day', 'month']),
  experience_required: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  required_skills: z.array(z.string()).optional().nullable(),
  full_address: z.string().optional().nullable(),
  location_name: z.string().optional().nullable(),
  is_urgent: z.boolean().optional().nullable(),
  gender_preference: z.enum(['any', 'male', 'female']).optional().nullable(),
  contact_method: z.enum(['in_app_chat', 'phone_call', 'whatsapp']).optional().nullable(),
  quantity_total: z.coerce.number().min(1, "At least 1 worker required").optional().nullable(),

  // Hourly specific
  shift_start: z.string().optional().nullable(),
  shift_end: z.string().optional().nullable(),
  total_hours: z.coerce.number().optional().nullable(),
  same_day_payment: z.boolean().optional().nullable(),

  // Daily specific
  number_of_days: z.coerce.number().optional().nullable(),
  start_date: z.string().optional().nullable(), // Forgiving string input, formatForDB handles it
  food_included: z.boolean().optional().nullable(),
  accommodation_included: z.boolean().optional().nullable(),
  overtime_available: z.boolean().optional().nullable(),

  // Monthly specific
  joining_date: z.string().optional().nullable(), // Forgiving string input
  working_days_per_week: z.string().optional().nullable(),
  salary_negotiable: z.boolean().optional(),
  pf_esi_included: z.boolean().optional(),
});

module.exports = {
  createJobSchema
};
