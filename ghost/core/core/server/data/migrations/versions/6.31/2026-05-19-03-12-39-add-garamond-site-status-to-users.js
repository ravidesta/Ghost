const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

// Adds a column tracking each author's Garamond Sites subscription
// status. The static-site publisher refuses to publish when status is
// not 'active'. Stripe / PayPal subscription webhooks (a future slice)
// flip this column.
module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const exists = await knex.schema.hasColumn('users', 'garamond_site_status');
        if (exists) {
            logging.warn('Skipping users.garamond_site_status — column already exists');
            return;
        }
        logging.info('Adding column: users.garamond_site_status');
        await knex.schema.alterTable('users', (table) => {
            table.string('garamond_site_status', 50).notNullable().defaultTo('inactive');
        });
    },
    async function down(knex) {
        const exists = await knex.schema.hasColumn('users', 'garamond_site_status');
        if (!exists) {
            return;
        }
        logging.info('Removing column: users.garamond_site_status');
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('garamond_site_status');
        });
    }
);
