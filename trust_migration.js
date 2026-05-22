const fs = require('fs');
const file = './src/services/mockData.ts';
let data = fs.readFileSync(file, 'utf8');

// Replace standard stats for each job in MOCK_JOBS
data = data.replace(/employer_ranking_score: [\d.]+,\n\s+employer_completed_jobs: \d+,\n\s+employer_verified: (true|false),\n\s+employer_reports: \d+,/g, () => {
  const rating = (Math.random() * 2 + 3).toFixed(1); // 3.0 to 5.0
  const completed = Math.floor(Math.random() * 80) + 1;
  const verified = Math.random() > 0.2;
  const reports = Math.random() > 0.9 ? 1 : 0; // mostly 0
  const responseRate = Math.floor(Math.random() * 40) + 60; // 60 to 100

  // Calculate Trust Score explicitly according to MVP algorithm formula
  let score = (parseFloat(rating) / 5) * 100 * 0.40;
  score += Math.min(completed, 100) * 0.25;
  score += verified ? 20 : 0;
  score += responseRate * 0.10;
  score -= reports * 15;
  const clampedTrustScore = Math.max(0, Math.min(score, 100)).toFixed(1);

  return `employer_trust_score: ${clampedTrustScore},
    employer_completed_jobs: ${completed},
    employer_verified: ${verified},
    employer_reports: ${reports},
    employer_response_rate: ${responseRate},`;
});

// Update MOCK_USER with worker trust fields
data = data.replace(/preferred_pay_type: 'day',/g, `preferred_pay_type: 'day',
  rating: 4.8,
  completed_jobs: 52,
  reports: 0,
  attendance: 95,
  trust_score: 93.4,`);

fs.writeFileSync(file, data);
