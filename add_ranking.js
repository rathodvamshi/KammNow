const fs = require('fs');
const file = './src/services/mockData.ts';
let data = fs.readFileSync(file, 'utf8');

// Replace standard stats for each job in MOCK_JOBS
data = data.replace(/poster_avatar: null,/g, (match) => {
  const ranking = (Math.random() * (95 - 60) + 60).toFixed(1);
  const completed = Math.floor(Math.random() * 200) + 1;
  const verified = Math.random() > 0.3 ? 'true' : 'false';
  const reports = Math.floor(Math.random() * 3);
  
  return `poster_avatar: null,
    employer_ranking_score: ${ranking},
    employer_completed_jobs: ${completed},
    employer_verified: ${verified},
    employer_reports: ${reports},`;
});

fs.writeFileSync(file, data);
