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

    _getClient() {
        if (!this._client) {
            const Stripe = require('stripe');
            this._client = new Stripe(this.apiKey);
        }
        return this._client;
    }

    /**
     * Open a Stripe Checkout Session in payment mode for a one-off book sale.
     * The session's metadata carries the member + book ids so the webhook
     * can route the captured payment back to the right buyer and product.
     *
     * @param {Object} args
     * @param {Object} args.book        plain book row (id, title, price_cents, currency)
     * @param {Object} args.member      plain member row (id, email)
     * @param {string} args.returnUrl
     * @param {string} args.cancelUrl
     * @returns {Promise<{redirectUrl: string, providerSessionId: string}>}
     */
    async createCheckout({book, member, returnUrl, cancelUrl}) {
        if (!book || !book.id || !book.price_cents) {
            throw new Error('stripe: book with id and price_cents is required');
        }
        if (!member || !member.id) {
            throw new Error('stripe: member with id is required');
        }
        if (!returnUrl || !cancelUrl) {
            throw new Error('stripe: returnUrl and cancelUrl are required');
        }

        const client = this._getClient();
        const session = await client.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: book.currency || 'usd',
                    unit_amount: book.price_cents,
                    product_data: {
                        name: book.title,
                        description: book.subtitle || undefined
                    }
                }
            }],
            customer_email: member.email,
            metadata: {
                memberId: member.id,
                bookId: book.id
            },
            success_url: returnUrl,
            cancel_url: cancelUrl
        });

        return {
            redirectUrl: session.url,
            providerSessionId: session.id
        };
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
