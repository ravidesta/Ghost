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

    _apiBase() {
        return this.sandbox
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';
    }

    async _accessToken() {
        // Cache the token until ~30s before expiry so back-to-back checkouts
        // do not re-auth on every call.
        const now = Date.now();
        if (this._token && this._tokenExpiresAt && this._tokenExpiresAt - 30_000 > now) {
            return this._token;
        }

        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const response = await fetch(`${this._apiBase()}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`paypal: oauth failed (${response.status}): ${text}`);
        }
        const json = await response.json();
        this._token = json.access_token;
        this._tokenExpiresAt = now + (json.expires_in || 0) * 1000;
        return this._token;
    }

    /**
     * Create a PayPal Order and return the approval URL the buyer should be
     * sent to. custom_id encodes "<memberId>:<bookId>" so the webhook can
     * route the captured payment back to the right buyer and product without
     * needing extra state on our side.
     *
     * @param {Object} args
     * @param {Object} args.book
     * @param {Object} args.member
     * @param {string} args.returnUrl
     * @param {string} args.cancelUrl
     */
    async createCheckout({book, member, returnUrl, cancelUrl}) {
        if (!book || !book.id || !book.price_cents) {
            throw new Error('paypal: book with id and price_cents is required');
        }
        if (!member || !member.id) {
            throw new Error('paypal: member with id is required');
        }
        if (!returnUrl || !cancelUrl) {
            throw new Error('paypal: returnUrl and cancelUrl are required');
        }

        const token = await this._accessToken();
        const currency = (book.currency || 'usd').toUpperCase();
        const value = (book.price_cents / 100).toFixed(2);

        const orderBody = {
            intent: 'CAPTURE',
            purchase_units: [{
                custom_id: `${member.id}:${book.id}`,
                description: book.title,
                amount: {currency_code: currency, value}
            }],
            application_context: {
                return_url: returnUrl,
                cancel_url: cancelUrl,
                user_action: 'PAY_NOW',
                brand_name: 'Garamond'
            }
        };

        const response = await fetch(`${this._apiBase()}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderBody)
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`paypal: create-order failed (${response.status}): ${text}`);
        }
        const order = await response.json();
        const approveLink = (order.links || []).find(l => l.rel === 'approve' || l.rel === 'payer-action');
        if (!approveLink) {
            throw new Error('paypal: order response missing approve link');
        }
        return {
            redirectUrl: approveLink.href,
            providerSessionId: order.id
        };
    }

    /**
     * Verify a PayPal webhook by calling PayPal's
     * /v1/notifications/verify-webhook-signature endpoint with the
     * configured webhook id and the headers PayPal included. Throws unless
     * PayPal returns `verification_status === 'SUCCESS'`.
     *
     * @param {Object} body     the parsed JSON webhook body
     * @param {Object} headers  the verification headers from the request
     * @returns {Promise<true>} resolves true on success, throws on mismatch
     */
    async verifyWebhook(body, headers) {
        const required = ['authAlgo', 'certUrl', 'transmissionId', 'transmissionSig', 'transmissionTime'];
        for (const key of required) {
            if (!headers || !headers[key]) {
                throw new Error(`paypal: missing webhook header ${key}`);
            }
        }

        const token = await this._accessToken();
        const response = await fetch(`${this._apiBase()}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                auth_algo: headers.authAlgo,
                cert_url: headers.certUrl,
                transmission_id: headers.transmissionId,
                transmission_sig: headers.transmissionSig,
                transmission_time: headers.transmissionTime,
                webhook_id: this.webhookId,
                webhook_event: body
            })
        });
        if (!response.ok) {
            throw new Error(`paypal: verify-webhook-signature failed (${response.status})`);
        }
        const json = await response.json();
        if (json.verification_status !== 'SUCCESS') {
            throw new Error('paypal: webhook signature verification failed');
        }
        return true;
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
