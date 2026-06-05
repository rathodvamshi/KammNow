exports.up = async function(knex) {
  // 1. users(firebase_uid)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
  `);

  // 2. jobs(provider_id)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_jobs_provider ON jobs(provider_id);
  `);

  // 3. job_applications(job_id)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
  `);

  // 4. jobs USING GIST(geom)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_jobs_geom ON jobs USING GIST(geom);
  `);
};

exports.down = async function(knex) {
  await knex.raw(`DROP INDEX IF EXISTS idx_users_firebase_uid;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_jobs_provider;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_job_applications_job;`);
  await knex.raw(`DROP INDEX IF EXISTS idx_jobs_geom;`);
};
