const fs = require('fs');

const file = 'src/services/mockData.ts';
let code = fs.readFileSync(file, 'utf8');

// Regex to find the MOCK_JOBS array block
const regex = /(export const MOCK_JOBS: Job\[\] = \[)([\s\S]*?)(\n\];)/;

const match = code.match(regex);
if (match) {
  let jobsContent = match[2];

  // We will simply regex replace each job block.
  // Instead, it's easier to use a JS evaluation if we strip types, but since it's TS, it's risky.
  // I will just use string replacements.
  // Find each closing bracket `  },`
  
  let newJobsContent = jobsContent.replace(/distance_km: ([\d.]+),/g, (m, dist) => {
    // Generate random but logical fields
    const r = Math.random();
    const work_type = r > 0.5 ? "'full_time'" : r > 0.25 ? "'part_time'" : "'one_time'";
    const skill_level = r > 0.6 ? "'skilled'" : r > 0.3 ? "'beginner'" : "'any'";
    const pay_schedule = r > 0.6 ? "'monthly'" : r > 0.3 ? "'weekly'" : "'daily'";
    const food = r > 0.5 ? "true" : "false";
    const stay = r > 0.8 ? "true" : "false";
    const travel = r > 0.7 ? "true" : "false";
    const dur_text = r > 0.6 ? "'Ongoing'" : r > 0.3 ? "'3 Days'" : "'1 Day'";
    
    return `distance_km: ${dist},
    work_start_date: '2026-08-10',
    work_end_date: '2026-08-15',
    work_start_time: '09:00 AM',
    work_end_time: '06:00 PM',
    duration_text: ${dur_text},
    work_type: ${work_type},
    skill_level: ${skill_level},
    payment_schedule: ${pay_schedule},
    food_included: ${food},
    stay_included: ${stay},
    travel_allowance: ${travel},
    language_pref: 'Telugu, Hindi',
    contact_phone: '+919876543210'`;
  });

  const newCode = code.replace(regex, `$1${newJobsContent}$3`);
  fs.writeFileSync(file, newCode);
  console.log("Updated mockData.ts with new fields");
} else {
  console.log("Failed to match MOCK_JOBS");
}
