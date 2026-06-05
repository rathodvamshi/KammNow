const { createJobSchema } = require('./validators/job');

const jobData = {
  title: "Test Job Title",
  description: "Test Description that is longer than thirty characters just to be extremely safe",
  category_id: "other",
  job_type: "day",
  salary_type: "day",
  is_urgent: false,
  salary: 500,
  
  shift_start: null,
  shift_end: null,
  total_hours: null,
  same_day_payment: false,

  number_of_days: 1,
  start_date: "2026-05-26",
  food_included: false,
  accommodation_included: false,
  overtime_available: false,

  joining_date: null,
  working_days_per_week: null,
  experience_required: null,
  salary_negotiable: false,
  pf_esi_included: false,

  latitude: 17.385,
  longitude: 78.4867,
  location_name: "Hyderabad",
  full_address: "Hyderabad, Telangana",

  required_skills: [],
  quantity_total: 1,
  gender_preference: "any",
  contact_method: "in_app_chat"
};

const result = createJobSchema.safeParse(jobData);
if (!result.success) {
  console.log('Validation Failed:', JSON.stringify(result.error, null, 2));
} else {
  console.log('Validation Succeeded!');
}
