// # PayPal webhook handler
//
// Wired at POST /garamond/webhooks/paypal. Verifies the PayPal webhook
// signature (the provider talks to PayPal's verify-webhook-signature
// endpoint), normalises the event, and records the purchase if it is a
// completed capture.
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {payments, storefront} = require('../../../services/garamond');

module.exports = async function handlePaypalWebhook(req, res, next) {
    try {
        const provider = payments.getProvider('paypal');
        if (!provider.isAvailable()) {
            return next(new errors.InternalServerError({
                message: 'PayPal webhook provider is not configured'
            }));
        }

        try {
            // PayPal verification reads several headers + the parsed body;
            // the provider talks to PayPal's verify-webhook-signature
            // endpoint and throws on mismatch.
            await provider.verifyWebhook(req.body, {
                authAlgo: req.headers['paypal-auth-algo'],
                certUrl: req.headers['paypal-cert-url'],
                transmissionId: req.headers['paypal-transmission-id'],
                transmissionSig: req.headers['paypal-transmission-sig'],
                transmissionTime: req.headers['paypal-transmission-time']
            });
        } catch (err) {
            logging.warn(`garamond: rejected PayPal webhook — ${err.message}`);
            return res.status(400).json({error: 'invalid_signature'});
        }

        const parsed = provider.parsePurchaseEvent(req.body);
        if (!parsed) {
            return res.status(200).json({received: true, processed: false});
        }

        await storefront.recordPurchase({
            memberId: parsed.memberId,
            bookId: parsed.bookId,
            amountCents: parsed.amountCents,
            currency: parsed.currency,
            paymentProvider: 'paypal',
            providerPaymentId: parsed.providerPaymentId
        });

        return res.status(200).json({received: true, processed: true});
    } catch (err) {
        logging.error({err, message: 'garamond: PayPal webhook processing failed'});
        return next(err);
    }
};
