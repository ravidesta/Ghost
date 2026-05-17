// # Garamond storefront
//
// Decides whether a member can download a given book. Records purchases.
// Keeps a thin facade over the BookPurchase model so callers (admin API,
// download endpoint, Stripe webhook) don't have to know Bookshelf.
//
// The model layer is loaded lazily — services run before models.init() in
// some boot orderings, so we resolve them on first use.
const errors = require('@tryghost/errors');

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
 * (member_id, book_id, stripe_payment_intent_id).
 *
 * @param {Object} args
 * @param {string} args.memberId
 * @param {string} args.bookId
 * @param {number} args.amountCents
 * @param {string} [args.currency]
 * @param {string} [args.stripePaymentIntentId]
 * @param {Date}   [args.purchasedAt]
 */
async function recordPurchase({
    memberId,
    bookId,
    amountCents,
    currency = 'usd',
    stripePaymentIntentId = null,
    purchasedAt = new Date()
}) {
    if (!memberId || !bookId) {
        throw new errors.BadRequestError({message: 'memberId and bookId are required'});
    }

    const {BookPurchase} = models();

    if (stripePaymentIntentId) {
        const existing = await BookPurchase.findOne(
            {stripe_payment_intent_id: stripePaymentIntentId},
            {require: false}
        );
        if (existing) {
            return existing;
        }
    }

    return BookPurchase.add({
        book_id: bookId,
        member_id: memberId,
        amount_cents: amountCents,
        currency,
        stripe_payment_intent_id: stripePaymentIntentId,
        status: 'paid',
        purchased_at: purchasedAt
    });
}

/**
 * Mark a purchase as refunded by Stripe payment intent id.
 *
 * @param {string} stripePaymentIntentId
 * @returns {Promise<Object|null>} the updated purchase, or null if not found
 */
async function refundPurchase(stripePaymentIntentId) {
    const {BookPurchase} = models();
    const purchase = await BookPurchase.findOne(
        {stripe_payment_intent_id: stripePaymentIntentId},
        {require: false}
    );
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
