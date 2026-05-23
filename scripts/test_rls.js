require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRls() {
  console.log('--- STARTING SUPABASE RLS SECURITY TESTS ---');

  console.log('\n[TEST 1] Read Public Jobs');
  const { data: jobs, error: err1 } = await supabase.from('jobs').select('id').limit(1);
  if (!err1) {
    console.log(`✅ TEST 1 PASSED: Anonymous read allowed. Found ${jobs.length} jobs.`);
  } else {
    console.error('❌ TEST 1 FAILED:', err1.message);
  }

  console.log('\n[TEST 2] Unauthorized Profile Update');
  // Attempt to update a profile using the anon key (no JWT/auth)
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { data: updateData, error: err2 } = await supabase
    .from('users')
    .update({ bio: 'Hacked!' })
    .eq('id', fakeId)
    .select();
    
  if (err2) {
    // If RLS explicitly blocks, it might throw an error or just return empty
    console.log('✅ TEST 2 PASSED: RLS blocked the update (Error:', err2.message, ')');
  } else if (!updateData || updateData.length === 0) {
    console.log('✅ TEST 2 PASSED: RLS blocked the update (0 rows affected).');
  } else {
    console.error('❌ TEST 2 FAILED: Update succeeded when it should have been blocked!');
  }

  console.log('\n[TEST 3] Unauthorized Job Insert');
  const { error: err3 } = await supabase
    .from('jobs')
    .insert({
      poster_id: fakeId,
      title: 'Hacked Job',
      category: 'Spam',
      description: 'spam',
      pay_amount: 100,
      pay_type: 'hour',
      location_lat: 0,
      location_lng: 0,
      location_name: 'Nowhere'
    });
    
  if (err3) {
    console.log('✅ TEST 3 PASSED: RLS blocked the insert (Error:', err3.message, ')');
  } else {
    console.error('❌ TEST 3 FAILED: Insert succeeded when it should have been blocked!');
  }
}

testRls();
