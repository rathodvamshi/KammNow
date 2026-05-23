const http = require('http');

async function testSecurity() {
  console.log('--- STARTING BACKEND SECURITY TESTS ---');
  
  console.log('\n[TEST 1] Unauthorized Access (Invalid JWT)');
  try {
    const res = await fetch('http://localhost:3000/api/secure-data', {
      headers: { Authorization: 'Bearer FAKE_TOKEN_123' }
    });
    console.log('Response Status:', res.status);
    console.log('Response Body:', await res.json());
    if (res.status === 401) console.log('✅ TEST 1 PASSED: Invalid JWT blocked.');
  } catch (err) {
    console.error('Test 1 Failed:', err.message);
  }

  console.log('\n[TEST 2] Rate Limiter Spam (105 requests)');
  let limitHit = false;
  let successCount = 0;
  
  for (let i = 0; i < 105; i++) {
    const res = await fetch('http://localhost:3000/api/health');
    if (res.status === 429) {
      if (!limitHit) {
        console.log(`\nHit rate limit on request #${i + 1}`);
        console.log('Response Status:', res.status);
        console.log('Response Body:', await res.json());
        limitHit = true;
      }
    } else if (res.status === 200) {
      successCount++;
    }
  }

  if (limitHit && successCount === 100) {
    console.log('✅ TEST 2 PASSED: Exactly 100 requests succeeded, remainder blocked by Rate Limiter (429).');
  } else {
    console.log(`❌ TEST 2 FAILED: limitHit=${limitHit}, successCount=${successCount}`);
  }
}

testSecurity();
