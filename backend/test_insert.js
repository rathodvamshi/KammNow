const db = require('./db');
async function test() {
  try {
    const res = await db.query(`
      INSERT INTO jobs (
        provider_id, title, description,
        pay_amount, pay_type, category,
        location_lat, location_lng,
        geom,
        required_skills,
        location_name,
        is_urgent,
        status,
        quantity_total,
        gender_preference,
        contact_method
      )
      VALUES (
        '10000000-0000-0000-0000-000000000000', 'Test Job', 'Test',
        100, 'fixed', 'other',
        17.4344, 78.4497,
        ST_SetSRID(ST_MakePoint(78.4497, 17.4344), 4326)::geometry,
        ARRAY['test'],
        'Test Location',
        false,
        'active',
        1,
        'any',
        'in_app_chat'
      )
      RETURNING *;
    `);
    console.log('Success:', res.rows[0].id);
  } catch(e) {
    console.error('Insert Failed:', e);
  }
  process.exit(0);
}
test();
