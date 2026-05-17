// # Garamond payouts
//
// Glues the royalty ledger to the payment providers. Flow:
//   1. Sum every pending royalty_ledger row for the author (per currency)
//   2. Call the chosen provider's sendPayout
//   3. Mark all the included ledger rows as paid, attaching the provider's
//      transfer id as the payout_reference so the dashboard can show
//      "paid via Stripe acct_X transfer tr_Y on 2026-05-17"
//
// Idempotency is the caller's job — pass a fresh batch and we'll send
// once. A future retry-aware version can hold an intermediate row in a
// `payout_batches` table; today's audit trail is the payout_reference on
// each ledger row.
const errors = require('@tryghost/errors');

const payments = require('../payments');
const royalties = require('../royalties');

let _models;
function models() {
    if (!_models) {
        _models = require('../../../models');
    }
    return _models;
}

/**
 * @param {Object} args
 * @param {string} args.authorId
 * @param {string} [args.provider]   override the author's default_payout_provider
 * @param {string} [args.currency='usd']
 */
async function payAuthor({authorId, provider: providerName, currency = 'usd'}) {
    if (!authorId) {
        throw new errors.BadRequestError({message: 'authorId is required'});
    }

    const {User, RoyaltyLedger} = models();
    const user = await User.findOne({id: authorId}, {require: false});
    if (!user) {
        throw new errors.NotFoundError({message: 'Author not found'});
    }

    const chosen = providerName || user.get('default_payout_provider') || 'stripe';
    const provider = payments.getProvider(chosen);
    if (!provider.isAvailable()) {
        throw new errors.BadRequestError({message: `Payment provider ${chosen} is not configured`});
    }
    if (typeof provider.sendPayout !== 'function') {
        throw new errors.BadRequestError({message: `Provider ${chosen} does not support payouts`});
    }

    const ledger = await RoyaltyLedger.findAll({
        filter: `author_id:${authorId}+payout_status:pending+currency:${currency}`
    });

    let total = 0;
    const ledgerIds = [];
    for (const row of ledger.models) {
        total += row.get('net_cents');
        ledgerIds.push(row.get('id'));
    }

    if (total <= 0) {
        return {paid: false, reason: 'no_balance', currency, amountCents: 0};
    }

    const payoutArgs = {amountCents: total, currency};
    if (chosen === 'stripe') {
        const accountId = user.get('stripe_connect_account_id');
        if (!accountId) {
            throw new errors.BadRequestError({message: 'Author has no Stripe Connect account on file'});
        }
        payoutArgs.stripeConnectAccountId = accountId;
        payoutArgs.description = `Garamond royalties for author ${authorId}`;
        payoutArgs.metadata = {authorId, ledgerRowCount: ledgerIds.length};
    } else if (chosen === 'paypal') {
        const email = user.get('paypal_payer_email');
        if (!email) {
            throw new errors.BadRequestError({message: 'Author has no PayPal email on file'});
        }
        payoutArgs.paypalPayerEmail = email;
        payoutArgs.note = `Royalty payout (${ledgerIds.length} sales)`;
    }

    const result = await provider.sendPayout(payoutArgs);

    const updated = await royalties.markPaidOut({
        ledgerIds,
        payoutReference: `${chosen}:${result.providerTransferId}`
    });

    return {
        paid: true,
        provider: chosen,
        currency,
        amountCents: total,
        ledgerRowsMarked: updated,
        providerTransferId: result.providerTransferId
    };
}

module.exports = {payAuthor};
