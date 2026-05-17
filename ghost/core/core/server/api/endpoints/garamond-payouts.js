const errors = require('@tryghost/errors');
const {payouts, royalties} = require('../../services/garamond');

// TODO(garamond): swap to `permissions: true` once a populate-permissions
// migration adds payout permissions. Auth middleware already restricts to
// admin users.
const PUBLIC = false;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'garamond_payouts',

    /**
     * GET /payouts/balance?authorId=...
     *
     * Returns the author's pending balance grouped by currency so a
     * multi-currency seller does not see a single confusing total.
     */
    balance: {
        headers: {cacheInvalidate: false},
        options: ['authorId'],
        validation: {options: {authorId: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const balance = await royalties.getAuthorBalance(frame.options.authorId);
            return {balance};
        }
    },

    /**
     * POST /payouts/pay
     * Body: { payouts: [{ authorId, provider?, currency? }] }
     *
     * Pays out every pending ledger row for the author in the chosen
     * currency. Returns the provider transfer id and the count of ledger
     * rows that were marked paid.
     */
    pay: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data?.payouts?.[0];
            if (!payload || !payload.authorId) {
                throw new errors.BadRequestError({message: 'authorId is required.'});
            }
            const result = await payouts.payAuthor({
                authorId: payload.authorId,
                provider: payload.provider,
                currency: payload.currency
            });
            return {payout: result};
        }
    }
};

module.exports = controller;
