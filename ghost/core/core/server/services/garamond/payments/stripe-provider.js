// # Stripe payment provider (stub)
//
// Real implementation will use Ghost's existing Stripe service:
//   - `createCheckout` opens a Stripe Checkout Session in payment mode with
//     `metadata: {bookId, memberId}` and a single line item priced from the
//     book row
//   - `verifyWebhook` uses `stripe.webhooks.constructEvent` with the
//     STRIPE_WEBHOOK_SECRET — fail-closed on mismatch
//   - `parsePurchaseEvent` only acts on `checkout.session.completed` events
//     where `payment_status === 'paid'`; ignores everything else
const PaymentProviderBase = require('./payment-provider-base');

class StripeProvider extends PaymentProviderBase {
    constructor(config = {}) {
        super(config);
        this.name = 'stripe';
        this.apiKey = config.apiKey;
        this.webhookSecret = config.webhookSecret;
    }

    isAvailable() {
        return Boolean(this.apiKey && this.webhookSecret);
    }

    async createCheckout(_args) {
        throw new Error('stripe: createCheckout not implemented yet');
    }

    /**
     * Verify a Stripe webhook signature against the raw request body.
     * Returns the parsed Stripe event on success; throws on mismatch.
     *
     * @param {Buffer|string} rawBody
     * @param {string} signature  the `Stripe-Signature` header
     * @returns {Object} the verified Stripe event
     */
    verifyWebhook(rawBody, signature) {
        if (!signature) {
            throw new Error('stripe: missing signature header');
        }
        // Lazy-load so an unconfigured Stripe deploy doesn't pay the import
        // cost on every cold boot.
        const Stripe = require('stripe');
        const client = new Stripe(this.apiKey);
        return client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    }

    parsePurchaseEvent(event) {
        if (!event || event.type !== 'checkout.session.completed') {
            return null;
        }
        const session = event.data?.object;
        if (!session || session.payment_status !== 'paid') {
            return null;
        }
        return {
            memberId: session.metadata?.memberId,
            bookId: session.metadata?.bookId,
            providerPaymentId: session.payment_intent,
            amountCents: session.amount_total ?? 0,
            currency: session.currency ?? 'usd'
        };
    }
}

module.exports = StripeProvider;
