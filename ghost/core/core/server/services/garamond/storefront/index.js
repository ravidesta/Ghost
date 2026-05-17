// # Garamond storefront
//
// Decides whether a member can download a given book. Records purchases.
// Keeps a thin facade over the BookPurchase model so callers (admin API,
// download endpoint, Stripe webhook) don't have to know Bookshelf.
//
// The model layer is loaded lazily — services run before models.init() in
// some boot orderings, so we resolve them on first use.
const errors = require('@tryghost/errors');
const royalties = require('../royalties');

let _models;
function models() {
    if (!_models) {
        _models = require('../../../models');
    }
    return _models;
}

/**
 * Whether the given member has purchased the given book (and not been refunded).
 * Free books (price_cents = null or 0) are always accessible to logged-in
 * members; nothing is accessible without a member.
 *
 * @param {Object} args
 * @param {string} args.memberId
 * @param {string} args.bookId
 * @returns {Promise<boolean>}
 */
async function hasAccess({memberId, bookId}) {
    if (!memberId || !bookId) {
        return false;
    }

    const {Book, BookPurchase} = models();
    const book = await Book.findOne({id: bookId}, {require: false});
    if (!book) {
        return false;
    }

    if (book.get('status') !== 'published') {
        return false;
    }

    const price = book.get('price_cents');
    if (!price) {
        // free books are accessible to any signed-in member
        return true;
    }

    const purchase = await BookPurchase.findOne(
        {member_id: memberId, book_id: bookId, status: 'paid'},
        {require: false}
    );
    return Boolean(purchase);
}

/**
 * Record that a member purchased a book. Idempotent on
 * (payment_provider, provider_payment_id).
 *
 * @param {Object} args
 * @param {string} args.memberId
 * @param {string} args.bookId
 * @param {number} args.amountCents
 * @param {string} [args.currency]
 * @param {string} [args.paymentProvider]  - 'stripe' | 'paypal' | ...
 * @param {string} [args.providerPaymentId]
 * @param {string} [args.stripePaymentIntentId]  - back-compat alias
 * @param {Date}   [args.purchasedAt]
 */
async function recordPurchase({
    memberId,
    bookId,
    amountCents,
    currency = 'usd',
    paymentProvider,
    providerPaymentId,
    stripePaymentIntentId,
    purchasedAt = new Date()
}) {
    if (!memberId || !bookId) {
        throw new errors.BadRequestError({message: 'memberId and bookId are required'});
    }

    // Back-compat: callers that still pass stripePaymentIntentId behave the
    // same way they always did — we just normalise into the new columns.
    const effectiveProvider = paymentProvider || (stripePaymentIntentId ? 'stripe' : 'stripe');
    const effectivePaymentId = providerPaymentId ?? stripePaymentIntentId ?? null;

    const {BookPurchase} = models();

    if (effectivePaymentId) {
        const existing = await BookPurchase.findOne(
            {payment_provider: effectiveProvider, provider_payment_id: effectivePaymentId},
            {require: false}
        );
        if (existing) {
            return existing;
        }
    }

    const purchase = await BookPurchase.add({
        book_id: bookId,
        member_id: memberId,
        amount_cents: amountCents,
        currency,
        payment_provider: effectiveProvider,
        provider_payment_id: effectivePaymentId,
        // also write the legacy column so downstream Stripe-aware code keeps
        // working until it's migrated to read provider_payment_id
        stripe_payment_intent_id: effectiveProvider === 'stripe' ? effectivePaymentId : null,
        status: 'paid',
        purchased_at: purchasedAt
    });

    // Write the matching royalty ledger entry so the author's pending balance
    // is updated automatically. Best-effort: a ledger failure should not block
    // the purchase being recorded, so we surface and continue.
    try {
        const {Book} = models();
        const book = await Book.findOne({id: bookId}, {require: false});
        const authorId = book && book.get('author_id');
        if (authorId) {
            await royalties.recordSale({
                bookId,
                authorId,
                grossCents: amountCents,
                currency,
                bookPurchaseId: purchase.id,
                recordedAt: purchasedAt
            });
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('garamond.storefront: royalty ledger write failed', err);
    }

    return purchase;
}

/**
 * Mark a purchase as refunded by provider + payment id.
 *
 * @param {Object|string} args - {paymentProvider, providerPaymentId} or, for
 *                                back-compat, a bare Stripe payment intent id.
 * @returns {Promise<Object|null>} the updated purchase, or null if not found
 */
async function refundPurchase(args) {
    const {BookPurchase} = models();
    let where;
    if (typeof args === 'string') {
        where = {payment_provider: 'stripe', provider_payment_id: args};
    } else {
        where = {
            payment_provider: args.paymentProvider,
            provider_payment_id: args.providerPaymentId
        };
    }
    const purchase = await BookPurchase.findOne(where, {require: false});
    if (!purchase) {
        return null;
    }
    return purchase.save({status: 'refunded'}, {patch: true});
}

/**
 * List a member's purchased books (paid status only).
 *
 * @param {string} memberId
 * @returns {Promise<Array>}
 */
async function listPurchases(memberId) {
    const {BookPurchase} = models();
    return BookPurchase.findAll({
        filter: `member_id:${memberId}+status:paid`,
        withRelated: ['book']
    });
}

module.exports = {
    hasAccess,
    recordPurchase,
    refundPurchase,
    listPurchases
};
