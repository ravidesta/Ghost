// # Stripe webhook handler
//
// Wired at POST /garamond/webhooks/stripe. Verifies the Stripe signature
// against the configured webhook secret, normalises the event via the
// StripeProvider, and records the purchase if it is a completed checkout.
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {payments, storefront} = require('../../../services/garamond');

module.exports = async function handleStripeWebhook(req, res, next) {
    let event;
    try {
        const provider = payments.getProvider('stripe');
        if (!provider.isAvailable()) {
            // Misconfigured: 503 so Stripe will retry once the deploy fixes it.
            return next(new errors.InternalServerError({
                message: 'Stripe webhook provider is not configured'
            }));
        }

        const signature = req.headers['stripe-signature'];
        event = provider.verifyWebhook(req.body, signature);
    } catch (err) {
        logging.warn(`garamond: rejected Stripe webhook — ${err.message}`);
        return res.status(400).json({error: 'invalid_signature'});
    }

    try {
        const provider = payments.getProvider('stripe');
        const parsed = provider.parsePurchaseEvent(event);
        if (!parsed) {
            // Ignored event types (refunds, customer.created, etc.) — 200 so
            // Stripe doesn't retry.
            return res.status(200).json({received: true, processed: false});
        }

        await storefront.recordPurchase({
            memberId: parsed.memberId,
            bookId: parsed.bookId,
            amountCents: parsed.amountCents,
            currency: parsed.currency,
            paymentProvider: 'stripe',
            providerPaymentId: parsed.providerPaymentId
        });

        return res.status(200).json({received: true, processed: true});
    } catch (err) {
        logging.error({err, message: 'garamond: Stripe webhook processing failed'});
        return next(err);
    }
};
