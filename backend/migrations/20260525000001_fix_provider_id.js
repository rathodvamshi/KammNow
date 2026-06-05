exports.up = async function(knex) {
  const hasEmployerId = await knex.schema.hasColumn('jobs', 'employer_id');
  const hasProviderId = await knex.schema.hasColumn('jobs', 'provider_id');

  if (hasEmployerId && !hasProviderId) {
    return knex.schema.alterTable('jobs', table => {
      table.renameColumn('employer_id', 'provider_id');
    });
  } else if (!hasEmployerId && !hasProviderId) {
    return knex.schema.alterTable('jobs', table => {
      table.uuid('provider_id').references('id').inTable('users').onDelete('CASCADE');
    });
  }
};

exports.down = async function(knex) {
  const hasProviderId = await knex.schema.hasColumn('jobs', 'provider_id');
  if (hasProviderId) {
    return knex.schema.alterTable('jobs', table => {
      table.renameColumn('provider_id', 'employer_id');
    });
  }
};
