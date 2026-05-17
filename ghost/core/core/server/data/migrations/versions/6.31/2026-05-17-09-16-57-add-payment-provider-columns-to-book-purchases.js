const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

// Splits the payment-provider identifier into its own column so the
// book_purchases ledger can record Stripe, PayPal, or anything we wire
// next. Existing rows get backfilled to payment_provider='stripe' with
// the previous stripe_payment_intent_id copied into provider_payment_id.
module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const hasProvider = await knex.schema.hasColumn('book_purchases', 'payment_provider');
        if (!hasProvider) {
            logging.info('Adding column: book_purchases.payment_provider');
            await knex.schema.alterTable('book_purchases', (table) => {
                table.string('payment_provider', 50).notNullable().defaultTo('stripe');
            });
        } else {
            logging.warn('Skipping book_purchases.payment_provider — column already exists');
        }

        const hasProviderId = await knex.schema.hasColumn('book_purchases', 'provider_payment_id');
        if (!hasProviderId) {
            logging.info('Adding column: book_purchases.provider_payment_id');
            await knex.schema.alterTable('book_purchases', (table) => {
                table.string('provider_payment_id', 255).nullable();
            });
            // Backfill: copy stripe_payment_intent_id into provider_payment_id
            // so existing rows are accessible via the new column.
            const hasLegacy = await knex.schema.hasColumn('book_purchases', 'stripe_payment_intent_id');
            if (hasLegacy) {
                logging.info('Backfilling book_purchases.provider_payment_id from stripe_payment_intent_id');
                await knex('book_purchases')
                    .whereNotNull('stripe_payment_intent_id')
                    .update({provider_payment_id: knex.ref('stripe_payment_intent_id')});
            }
        } else {
            logging.warn('Skipping book_purchases.provider_payment_id — column already exists');
        }
    },

    async function down(knex) {
        const hasProviderId = await knex.schema.hasColumn('book_purchases', 'provider_payment_id');
        if (hasProviderId) {
            logging.info('Removing column: book_purchases.provider_payment_id');
            await knex.schema.alterTable('book_purchases', (table) => {
                table.dropColumn('provider_payment_id');
            });
        }

        const hasProvider = await knex.schema.hasColumn('book_purchases', 'payment_provider');
        if (hasProvider) {
            logging.info('Removing column: book_purchases.payment_provider');
            await knex.schema.alterTable('book_purchases', (table) => {
                table.dropColumn('payment_provider');
            });
        }
    }
);
