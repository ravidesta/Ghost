const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

// Adds connected-account columns to users so the Garamond payouts service
// knows where to send each author's royalties. All three columns are
// additive and nullable so installs without Garamond enabled remain
// unchanged.
const COLUMNS = [
    {name: 'stripe_connect_account_id', type: 'string', maxlength: 100},
    {name: 'paypal_payer_email', type: 'string', maxlength: 191},
    {name: 'default_payout_provider', type: 'string', maxlength: 50}
];

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        for (const col of COLUMNS) {
            const exists = await knex.schema.hasColumn('users', col.name);
            if (exists) {
                logging.warn(`Skipping users.${col.name} — column already exists`);
                continue;
            }
            logging.info(`Adding column: users.${col.name}`);
            await knex.schema.alterTable('users', (table) => {
                table.string(col.name, col.maxlength).nullable();
            });
        }
    },
    async function down(knex) {
        for (const col of COLUMNS.slice().reverse()) {
            const exists = await knex.schema.hasColumn('users', col.name);
            if (!exists) {
                continue;
            }
            logging.info(`Removing column: users.${col.name}`);
            await knex.schema.alterTable('users', (table) => {
                table.dropColumn(col.name);
            });
        }
    }
);
