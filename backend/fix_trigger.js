const db = require('./db');
async function fixTrigger() {
  try {
    await db.query(`
      CREATE OR REPLACE FUNCTION public.update_jobs_geom()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
          NEW.geom = ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
        END IF;
        RETURN NEW;
      END;
      $function$;
    `);
    console.log('Fixed trigger!');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
fixTrigger();
