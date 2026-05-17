// # Garamond royalties
//
// Records one ledger entry per paid sale, refunded sale, or manual
// adjustment, and answers "what does author X have pending right now?".
// The storefront writes to it; the admin dashboard reads from it.
const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');

const {calculateSplit, invertForRefund, DEFAULT_PLATFORM_FEE_RATE} = require('./split');

let _models;
function models() {
    if (!_models) {
        _models = require('../../../models');
    }
    return _models;
}

function platformFeeRate() {
    const rate = config.get('garamond')?.royalties?.platformFeeRate;
    return Number.isFinite(rate) ? rate : DEFAULT_PLATFORM_FEE_RATE;
}

/**
 * Record a paid sale. Idempotent on book_purchase_id when supplied — calling
 * twice with the same purchase id returns the original ledger row.
 *
 * @param {Object} args
 * @param {string} args.bookId
 * @param {string} args.authorId
 * @param {number} args.grossCents
 * @param {string} [args.currency='usd']
 * @param {string} [args.bookPurchaseId]
 * @param {number} [args.feeRate]   overrides the configured platform fee
 * @param {Date}   [args.recordedAt]
 */
async function recordSale({
    bookId,
    authorId,
    grossCents,
    currency = 'usd',
    bookPurchaseId = null,
    feeRate,
    recordedAt = new Date()
}) {
    if (!bookId || !authorId) {
        throw new errors.BadRequestError({message: 'bookId and authorId are required'});
    }

    const {RoyaltyLedger} = models();

    if (bookPurchaseId) {
        const existing = await RoyaltyLedger.findOne(
            {book_purchase_id: bookPurchaseId, entry_type: 'sale'},
            {require: false}
        );
        if (existing) {
            return existing;
        }
    }

    const split = calculateSplit({grossCents, feeRate: feeRate ?? platformFeeRate()});

    return RoyaltyLedger.add({
        book_id: bookId,
        author_id: authorId,
        book_purchase_id: bookPurchaseId,
        entry_type: 'sale',
        gross_cents: split.grossCents,
        platform_fee_cents: split.platformFeeCents,
        net_cents: split.netCents,
        currency,
        payout_status: 'pending',
        recorded_at: recordedAt
    });
}

/**
 * Record a refund — writes a negative-valued ledger row so the running sum
 * for the author drops by the right amount.
 *
 * @param {Object} args
 * @param {string} args.bookId
 * @param {string} args.authorId
 * @param {string} args.bookPurchaseId
 * @param {number} args.grossCents
 * @param {string} [args.currency='usd']
 * @param {number} [args.feeRate]
 */
async function recordRefund({
    bookId,
    authorId,
    bookPurchaseId,
    grossCents,
    currency = 'usd',
    feeRate
}) {
    if (!bookId || !authorId) {
        throw new errors.BadRequestError({message: 'bookId and authorId are required'});
    }

    const {RoyaltyLedger} = models();

    const existing = await RoyaltyLedger.findOne(
        {book_purchase_id: bookPurchaseId, entry_type: 'refund'},
        {require: false}
    );
    if (existing) {
        return existing;
    }

    const split = invertForRefund(
        calculateSplit({grossCents, feeRate: feeRate ?? platformFeeRate()})
    );

    return RoyaltyLedger.add({
        book_id: bookId,
        author_id: authorId,
        book_purchase_id: bookPurchaseId,
        entry_type: 'refund',
        gross_cents: split.grossCents,
        platform_fee_cents: split.platformFeeCents,
        net_cents: split.netCents,
        currency,
        payout_status: 'pending',
        recorded_at: new Date()
    });
}

/**
 * Sum what an author has earned but hasn't been paid out yet, grouped by
 * currency (so authors selling in multiple currencies don't get a single
 * confusing total).
 *
 * @param {string} authorId
 * @returns {Promise<{[currency: string]: number}>}
 */
async function getAuthorBalance(authorId) {
    const {RoyaltyLedger} = models();
    const rows = await RoyaltyLedger.findAll({
        filter: `author_id:${authorId}+payout_status:pending`
    });

    const totals = {};
    for (const row of rows.models) {
        const currency = row.get('currency');
        totals[currency] = (totals[currency] || 0) + row.get('net_cents');
    }
    return totals;
}

/**
 * Mark a set of pending ledger rows as paid out (e.g. after a Stripe transfer
 * or PayPal payout completes). `payoutReference` is a free-form string the
 * caller can use to link back to the payout provider's transaction id.
 *
 * @param {Object} args
 * @param {string[]} args.ledgerIds
 * @param {string}   args.payoutReference
 */
async function markPaidOut({ledgerIds, payoutReference}) {
    if (!Array.isArray(ledgerIds) || ledgerIds.length === 0) {
        return 0;
    }
    const {RoyaltyLedger} = models();
    const filter = ledgerIds.map(id => `id:${id}`).join(',');
    const rows = await RoyaltyLedger.findAll({filter});
    let updated = 0;
    for (const row of rows.models) {
        if (row.get('payout_status') === 'pending') {
            await row.save({
                payout_status: 'paid',
                payout_reference: payoutReference
            }, {patch: true});
            updated++;
        }
    }
    return updated;
}

module.exports = {
    DEFAULT_PLATFORM_FEE_RATE,
    calculateSplit,
    invertForRefund,
    platformFeeRate,
    recordSale,
    recordRefund,
    getAuthorBalance,
    markPaidOut
};
