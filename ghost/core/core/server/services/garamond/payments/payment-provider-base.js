// Base class every Garamond payment provider extends. Keep the surface
// small — Stripe and PayPal both fit it; if a third provider needs more,
// we extend here, not in callers.

class PaymentProviderBase {
    constructor(config = {}) {
        this.config = config;
        this.name = 'base';
    }

    /**
     * Whether this provider has the credentials it needs to take payments.
     * @returns {boolean}
     */
    isAvailable() {
        return false;
    }

    /**
     * Start a checkout for a book. Returns the URL the buyer should be sent to.
     *
     * @param {Object} _args
     * @param {Object} _args.book     plain book row (id, title, price_cents, currency)
     * @param {Object} _args.member   plain member row (id, email)
     * @param {string} _args.returnUrl
     * @param {string} _args.cancelUrl
     * @returns {Promise<{redirectUrl: string, providerSessionId: string}>}
     */
    async createCheckout(_args) {
        throw new Error(`${this.name}: createCheckout not implemented`);
    }

    /**
     * Verify a webhook signature against the raw request body. Throws on
     * mismatch — callers should not catch.
     *
     * @param {Buffer|string} _rawBody
     * @param {string} _signature
     */
    verifyWebhook(_rawBody, _signature) {
        throw new Error(`${this.name}: verifyWebhook not implemented`);
    }

    /**
     * Normalise a provider event into a generic purchase payload, or return
     * null if the event isn't a successful purchase (e.g. a `pending` ping).
     *
     * @param {Object} _event
     * @returns {{memberId: string, bookId: string, providerPaymentId: string, amountCents: number, currency: string}|null}
     */
    parsePurchaseEvent(_event) {
        throw new Error(`${this.name}: parsePurchaseEvent not implemented`);
    }
}

module.exports = PaymentProviderBase;
