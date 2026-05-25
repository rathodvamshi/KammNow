import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // ramp up to 100 users over 30 seconds
    { duration: '1m', target: 500 },  // spike to 500 users over 1 minute
    { duration: '30s', target: 0 },   // ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Simulate querying from Mumbai (Popular city, should trigger Redis cache HIT)
  const mumbaiLat = 19.0760;
  const mumbaiLon = 72.8777;
  
  // We don't have a valid JWT for the load tester by default, 
  // so we will test the performance of the endpoint logic. 
  // Note: if the endpoint enforces authentication strictly, this load test will just benchmark the auth rejection speed
  // To truly test the DB/Redis, either mock auth or use a valid token.
  
  // Assuming a valid token is provided via environment variable: k6 run -e TOKEN=mytoken load-test.js
  const params = {
    headers: {
      'Content-Type': 'application/json',
      ...(Object.keys(__ENV).includes('TOKEN') ? { 'Authorization': `Bearer ${__ENV.TOKEN}` } : {})
    },
  };

  const res = http.get(`${BASE_URL}/api/jobs/feed?lat=${mumbaiLat}&lon=${mumbaiLon}`, params);
  
  check(res, {
    'is status 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  
  // Simulate user reading feed before refreshing
  sleep(1);
}
