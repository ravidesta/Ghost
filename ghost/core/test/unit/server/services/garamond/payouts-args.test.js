const assert = require('node:assert/strict');

const StripeProvider = require('../../../../../core/server/services/garamond/payments/stripe-provider');
const PayPalProvider = require('../../../../../core/server/services/garamond/payments/paypal-provider');

describe('Garamond: payout arg validation', function () {
    describe('StripeProvider.sendPayout', function () {
        const provider = new StripeProvider({apiKey: 'sk', webhookSecret: 'wh'});

        it('rejects when the connected account id is missing', async function () {
            await assert.rejects(
                () => provider.sendPayout({amountCents: 1000}),
                /stripeConnectAccountId/
            );
        });

        it('rejects a non-positive amount', async function () {
            await assert.rejects(
                () => provider.sendPayout({stripeConnectAccountId: 'acct_x', amountCents: 0}),
                /amountCents/
            );
            await assert.rejects(
                () => provider.sendPayout({stripeConnectAccountId: 'acct_x', amountCents: -1}),
                /amountCents/
            );
        });
    });

    describe('PayPalProvider.sendPayout', function () {
        const provider = new PayPalProvider({clientId: 'c', clientSecret: 's', webhookId: 'w'});

        it('rejects when the payer email is missing', async function () {
            await assert.rejects(
                () => provider.sendPayout({amountCents: 1000}),
                /paypalPayerEmail/
            );
        });

        it('rejects a non-positive amount', async function () {
            await assert.rejects(
                () => provider.sendPayout({paypalPayerEmail: 'a@b.com', amountCents: 0}),
                /amountCents/
            );
        });
    });
});
