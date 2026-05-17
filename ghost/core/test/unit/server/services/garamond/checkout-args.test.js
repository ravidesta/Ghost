const assert = require('node:assert/strict');

const StripeProvider = require('../../../../../core/server/services/garamond/payments/stripe-provider');
const PayPalProvider = require('../../../../../core/server/services/garamond/payments/paypal-provider');

describe('Garamond: createCheckout argument validation', function () {
    const book = {id: 'b1', title: 'T', price_cents: 599, currency: 'usd'};
    const member = {id: 'm1', email: 'm@example.com'};
    const returnUrl = 'https://site.example/garamond/books/b1/success';
    const cancelUrl = 'https://site.example/garamond/books/b1/cancel';

    describe('StripeProvider', function () {
        const provider = new StripeProvider({apiKey: 'sk', webhookSecret: 'wh'});

        it('rejects when the book has no price', async function () {
            await assert.rejects(
                () => provider.createCheckout({book: {id: 'b1', title: 'T'}, member, returnUrl, cancelUrl}),
                /price_cents/
            );
        });

        it('rejects when the member is missing', async function () {
            await assert.rejects(
                () => provider.createCheckout({book, member: null, returnUrl, cancelUrl}),
                /member/
            );
        });

        it('rejects when the URLs are missing', async function () {
            await assert.rejects(
                () => provider.createCheckout({book, member, cancelUrl}),
                /returnUrl/
            );
        });
    });

    describe('PayPalProvider', function () {
        const provider = new PayPalProvider({clientId: 'c', clientSecret: 's', webhookId: 'w'});

        it('rejects when the book has no price', async function () {
            await assert.rejects(
                () => provider.createCheckout({book: {id: 'b1', title: 'T'}, member, returnUrl, cancelUrl}),
                /price_cents/
            );
        });

        it('rejects when the member is missing', async function () {
            await assert.rejects(
                () => provider.createCheckout({book, member: null, returnUrl, cancelUrl}),
                /member/
            );
        });

        it('rejects when the URLs are missing', async function () {
            await assert.rejects(
                () => provider.createCheckout({book, member, returnUrl}),
                /cancelUrl/
            );
        });

        it('exposes the right API base for sandbox vs live', function () {
            assert.equal(
                new PayPalProvider({clientId: 'x', clientSecret: 'y', webhookId: 'z', sandbox: true})._apiBase(),
                'https://api-m.sandbox.paypal.com'
            );
            assert.equal(
                new PayPalProvider({clientId: 'x', clientSecret: 'y', webhookId: 'z', sandbox: false})._apiBase(),
                'https://api-m.paypal.com'
            );
        });
    });
});
