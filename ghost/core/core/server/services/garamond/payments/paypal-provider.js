// # PayPal payment provider (stub)
//
// Real implementation will use the PayPal Orders API:
//   - `createCheckout` POSTs to /v2/checkout/orders with the book as a
//     single purchase_unit, custom_id set to `${memberId}:${bookId}` so the
//     webhook can recover both ids
//   - `verifyWebhook` calls /v1/notifications/verify-webhook-signature
//     with the configured webhook id; fail-closed on `SUCCESS` mismatch
//   - `parsePurchaseEvent` only acts on PAYMENT.CAPTURE.COMPLETED events
//     in sandbox/live based on config.sandbox
const PaymentProviderBase = require('./payment-provider-base');

class PayPalProvider extends PaymentProviderBase {
    constructor(config = {}) {
        super(config);
        this.name = 'paypal';
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.webhookId = config.webhookId;
        this.sandbox = config.sandbox !== false; // default to sandbox for safety
    }

    isAvailable() {
        return Boolean(this.clientId && this.clientSecret && this.webhookId);
    }

    async createCheckout(_args) {
        throw new Error('paypal: createCheckout not implemented yet');
    }

    /**
     * Verify a PayPal webhook by calling PayPal's
     * /v1/notifications/verify-webhook-signature endpoint with the
     * configured webhook id and the headers PayPal included. Throws unless
     * PayPal returns `verification_status === 'SUCCESS'`.
     *
     * Marked async-callable but kept sync-throwing in tests where it isn't
     * actually invoked over the network.
     *
     * @param {Object} body   the parsed JSON webhook body
     * @param {Object} headers  the verification headers from the request
     */
    verifyWebhook(_body, _headers) {
        // The real network call lives behind this branch — it is intentionally
        // a runtime concern. The integration test for the webhook route stubs
        // the provider so the real path is exercised once payouts go live.
        throw new Error('paypal: verifyWebhook needs a live PayPal credential — stub for now');
    }

    parsePurchaseEvent(event) {
        if (!event || event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
            return null;
        }
        const resource = event.resource;
        if (!resource || resource.status !== 'COMPLETED') {
            return null;
        }

        // custom_id encodes "<memberId>:<bookId>" so we can route the payment
        // back to the right buyer + product
        const customId = resource.custom_id || '';
        const [memberId, bookId] = customId.split(':');
        if (!memberId || !bookId) {
            return null;
        }

        const amount = resource.amount || {};
        const value = parseFloat(amount.value || '0');
        return {
            memberId,
            bookId,
            providerPaymentId: resource.id,
            amountCents: Math.round(value * 100),
            currency: (amount.currency_code || 'USD').toLowerCase()
        };
    }
}

module.exports = PayPalProvider;
