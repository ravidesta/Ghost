// # Garamond marketplace
//
// Lifecycle for paid editing / illustration / cover jobs. The author
// posts a job, a vetted provider claims it, delivers, and on accept
// the platform transfers the budget (minus platform_fee_pct) to the
// provider via either Stripe Connect or PayPal Payouts — the provider
// picks. Disputes flip to a terminal status and require admin
// intervention; there is no automatic refund flow yet.
//
// Money model: the funding step is left to the caller (admin or a
// future buyer-facing payment route) — we just record the
// `funding_reference` so the audit trail stays intact. The acceptance
// step is where the platform actually moves money out.
const errors = require('@tryghost/errors');

const {assertTransition} = require('./transitions');
const payments = require('../payments');

let _models;
function models() {
    if (!_models) {
        _models = require('../../../models');
    }
    return _models;
}

function _calculateProviderShare({budgetCents, platformFeePct}) {
    const fee = Math.round(budgetCents * (platformFeePct / 100));
    return {feeCents: fee, providerCents: budgetCents - fee};
}

async function _loadOffer(offerId) {
    const {ServiceOffer} = models();
    const offer = await ServiceOffer.findOne({id: offerId}, {require: false});
    if (!offer) {
        throw new errors.NotFoundError({message: 'Offer not found'});
    }
    return offer;
}

function _authoriseActor({offer, userId, expectedRole}) {
    if (expectedRole === 'author' && offer.get('author_id') !== userId) {
        throw new errors.NoPermissionError({message: 'Only the author can take this action.'});
    }
    if (expectedRole === 'provider' && offer.get('provider_id') !== userId) {
        throw new errors.NoPermissionError({message: 'Only the assigned provider can take this action.'});
    }
}

/**
 * Author creates a new offer (status: draft). No money has moved yet.
 */
async function postOffer({authorId, kind, title, description, budgetCents, currency, bookId, deadline, platformFeePct, paymentProvider}) {
    if (!authorId || !title || !budgetCents || budgetCents <= 0) {
        throw new errors.BadRequestError({message: 'authorId, title, and a positive budgetCents are required'});
    }
    const {ServiceOffer} = models();
    const row = await ServiceOffer.add({
        author_id: authorId,
        kind: kind || 'other',
        title,
        description: description || null,
        budget_cents: budgetCents,
        currency: currency || 'usd',
        book_id: bookId || null,
        deadline: deadline || null,
        platform_fee_pct: Number.isFinite(platformFeePct) ? platformFeePct : 15,
        payment_provider: paymentProvider || null,
        status: 'draft'
    });
    return row.toJSON();
}

/**
 * Author confirms they have funded the offer (e.g. Stripe payment
 * intent succeeded). Moves draft → posted. The reference is opaque to
 * the platform — it just gets stored for the audit trail.
 */
async function fundOffer({offerId, authorId, fundingReference, paymentProvider}) {
    const offer = await _loadOffer(offerId);
    _authoriseActor({offer, userId: authorId, expectedRole: 'author'});
    const {to} = assertTransition(offer.get('status'), 'post', 'author');
    await offer.save({
        status: to,
        funding_reference: fundingReference || offer.get('funding_reference'),
        payment_provider: paymentProvider || offer.get('payment_provider')
    }, {patch: true});
    return offer.toJSON();
}

/**
 * Provider claims a posted offer.
 */
async function claimOffer({offerId, providerId}) {
    const offer = await _loadOffer(offerId);
    if (offer.get('provider_id') && offer.get('provider_id') !== providerId) {
        throw new errors.ConflictError({message: 'Offer is already claimed by another provider.'});
    }
    const {to} = assertTransition(offer.get('status'), 'claim', 'provider');
    await offer.save({status: to, provider_id: providerId}, {patch: true});
    return offer.toJSON();
}

/**
 * Provider starts work.
 */
async function startOffer({offerId, providerId}) {
    const offer = await _loadOffer(offerId);
    _authoriseActor({offer, userId: providerId, expectedRole: 'provider'});
    const {to} = assertTransition(offer.get('status'), 'start', 'provider');
    await offer.save({status: to}, {patch: true});
    return offer.toJSON();
}

/**
 * Provider marks the work delivered. `deliveryNotes` is free-form
 * (links to a Drive folder, a Garamond bundle, etc).
 */
async function deliverOffer({offerId, providerId, deliveryNotes}) {
    const offer = await _loadOffer(offerId);
    _authoriseActor({offer, userId: providerId, expectedRole: 'provider'});
    const {to} = assertTransition(offer.get('status'), 'deliver', 'provider');
    await offer.save({status: to, delivery_notes: deliveryNotes || offer.get('delivery_notes')}, {patch: true});
    return offer.toJSON();
}

/**
 * Author accepts the delivery. Triggers the payout from the platform
 * balance to the provider's connected account or PayPal email, minus
 * the platform fee.
 */
async function acceptOffer({offerId, authorId}) {
    const offer = await _loadOffer(offerId);
    _authoriseActor({offer, userId: authorId, expectedRole: 'author'});
    assertTransition(offer.get('status'), 'accept', 'author');

    const providerId = offer.get('provider_id');
    if (!providerId) {
        throw new errors.BadRequestError({message: 'Offer has no provider assigned.'});
    }

    const {User} = models();
    const providerUser = await User.findOne({id: providerId}, {require: false});
    if (!providerUser) {
        throw new errors.NotFoundError({message: 'Provider account not found.'});
    }

    const providerProvider = offer.get('payment_provider')
        || providerUser.get('default_payout_provider')
        || 'stripe';
    const paymentProvider = payments.getProvider(providerProvider);
    if (!paymentProvider.isAvailable()) {
        throw new errors.BadRequestError({message: `Payment provider ${providerProvider} is not configured.`});
    }
    if (typeof paymentProvider.sendPayout !== 'function') {
        throw new errors.BadRequestError({message: `Provider ${providerProvider} does not support payouts.`});
    }

    const {providerCents} = _calculateProviderShare({
        budgetCents: offer.get('budget_cents'),
        platformFeePct: offer.get('platform_fee_pct')
    });

    const payoutArgs = {amountCents: providerCents, currency: offer.get('currency')};
    if (providerProvider === 'stripe') {
        const accountId = providerUser.get('stripe_connect_account_id');
        if (!accountId) {
            throw new errors.BadRequestError({message: 'Provider has no Stripe Connect account on file.'});
        }
        payoutArgs.stripeConnectAccountId = accountId;
        payoutArgs.description = `Garamond offer ${offer.get('id')} — ${offer.get('title')}`;
        payoutArgs.metadata = {offerId: offer.get('id'), providerId, authorId};
    } else if (providerProvider === 'paypal') {
        const email = providerUser.get('paypal_payer_email');
        if (!email) {
            throw new errors.BadRequestError({message: 'Provider has no PayPal email on file.'});
        }
        payoutArgs.paypalPayerEmail = email;
        payoutArgs.note = `Garamond offer ${offer.get('id')}`;
    }

    const result = await paymentProvider.sendPayout(payoutArgs);

    await offer.save({
        status: 'accepted',
        accepted_at: new Date(),
        payment_provider: providerProvider,
        payout_reference: `${providerProvider}:${result.providerTransferId}`
    }, {patch: true});

    return offer.toJSON();
}

/**
 * Either side can dispute. Status becomes terminal and an admin must
 * intervene manually for refunds / partial payouts.
 */
async function disputeOffer({offerId, actorId, reason}) {
    const offer = await _loadOffer(offerId);
    const who = offer.get('author_id') === actorId ? 'author'
              : offer.get('provider_id') === actorId ? 'provider'
              : null;
    if (!who) {
        throw new errors.NoPermissionError({message: 'Only the author or assigned provider can dispute.'});
    }
    assertTransition(offer.get('status'), 'dispute', who);
    await offer.save({
        status: 'disputed',
        delivery_notes: reason
            ? `[DISPUTE by ${who}] ${reason}\n${offer.get('delivery_notes') || ''}`
            : offer.get('delivery_notes')
    }, {patch: true});
    return offer.toJSON();
}

/**
 * Cancel an offer before it reaches a terminal state.
 */
async function cancelOffer({offerId, actorId}) {
    const offer = await _loadOffer(offerId);
    const who = offer.get('author_id') === actorId ? 'author' : 'admin';
    assertTransition(offer.get('status'), 'cancel', who);
    await offer.save({status: 'canceled'}, {patch: true});
    return offer.toJSON();
}

async function listOffers({status, authorId, providerId, kind} = {}) {
    const {ServiceOffer} = models();
    const filters = [];
    if (status) filters.push(`status:${status}`);
    if (authorId) filters.push(`author_id:${authorId}`);
    if (providerId) filters.push(`provider_id:${providerId}`);
    if (kind) filters.push(`kind:${kind}`);
    const filter = filters.length ? filters.join('+') : undefined;
    const collection = await ServiceOffer.findPage({filter, order: 'created_at desc', limit: 100});
    return collection.data.map(m => m.toJSON());
}

async function getOffer(offerId) {
    const offer = await _loadOffer(offerId);
    return offer.toJSON();
}

module.exports = {
    postOffer,
    fundOffer,
    claimOffer,
    startOffer,
    deliverOffer,
    acceptOffer,
    disputeOffer,
    cancelOffer,
    listOffers,
    getOffer,
    _calculateProviderShare
};
