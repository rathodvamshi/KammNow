const db = require('./db');
async function test() {
  try {
    const userId = (await db.query("SELECT id FROM users LIMIT 1")).rows[0].id;
    const result = await db.query(`
      INSERT INTO jobs (
        provider_id, title, description,
        pay_amount, pay_type, category,
        location_lat, location_lng, geom,
        required_skills, location_name, full_address,
        is_urgent, status,
        quantity_total, gender_preference, contact_method,
        job_type, shift_start, shift_end, total_hours, same_day_payment,
        number_of_days, start_date,
        food_included, accommodation_included, overtime_available,
        joining_date, working_days_per_week,
        experience_required, salary_negotiable, pf_esi_included
      )
      VALUES (
        $1,  $2,  $3,
        $4,  $5,  $6,
        $7::float8, $8::float8,
        ST_SetSRID(ST_MakePoint($8::float8, $7::float8), 4326)::geometry,
        $9,  $10, $11,
        $12, 'active',
        $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22,
        $23, $24, $25,
        $26, $27,
        $28, $29, $30
      )
      RETURNING id, title;
    `, [
      userId, 'Test Plumber', 'Fix my sink',
      500, 'day', 'plumber',
      17.39, 78.49,
      ['plumbing'], 'Banjara Hills', 'Banjara Hills, Hyderabad',
      true, 
      2, 'any', 'in_app_chat',
      'day', '9:00 AM', '6:00 PM', null, false,
      5, '2026-05-27',
      true, false, false,
      null, '6 Days',
      '1-2 Years', false, false
    ]);
    console.log('✅ Success! Inserted job:', result.rows[0].id);
    await db.query("DELETE FROM jobs WHERE id = $1", [result.rows[0].id]);
    console.log('Cleaned up test job.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Insert failed:', e.message);
    process.exit(1);
  }
}
test();
