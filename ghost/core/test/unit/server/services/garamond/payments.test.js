const assert = require('node:assert/strict');

const PaymentProviderBase = require('../../../../../core/server/services/garamond/payments/payment-provider-base');
const StripeProvider = require('../../../../../core/server/services/garamond/payments/stripe-provider');
const PayPalProvider = require('../../../../../core/server/services/garamond/payments/paypal-provider');
const payments = require('../../../../../core/server/services/garamond/payments');

describe('Garamond: payments', function () {
    describe('StripeProvider', function () {
        it('extends PaymentProviderBase', function () {
            assert.ok(new StripeProvider() instanceof PaymentProviderBase);
        });

        it('is unavailable without apiKey + webhookSecret', function () {
            assert.equal(new StripeProvider({}).isAvailable(), false);
            assert.equal(new StripeProvider({apiKey: 'sk_x'}).isAvailable(), false);
        });

        it('is available when fully configured', function () {
            const provider = new StripeProvider({apiKey: 'sk_x', webhookSecret: 'whsec_x'});
            assert.equal(provider.isAvailable(), true);
        });

        describe('parsePurchaseEvent', function () {
            const provider = new StripeProvider({apiKey: 'x', webhookSecret: 'y'});

            it('returns null for unrelated event types', function () {
                assert.equal(provider.parsePurchaseEvent({type: 'customer.created'}), null);
            });

            it('returns null when the session is not paid', function () {
                const event = {
                    type: 'checkout.session.completed',
                    data: {object: {payment_status: 'unpaid'}}
                };
                assert.equal(provider.parsePurchaseEvent(event), null);
            });

            it('returns a normalised payload for a completed session', function () {
                const event = {
                    type: 'checkout.session.completed',
                    data: {
                        object: {
                            payment_status: 'paid',
                            payment_intent: 'pi_123',
                            amount_total: 599,
                            currency: 'usd',
                            metadata: {memberId: 'm1', bookId: 'b1'}
                        }
                    }
                };
                assert.deepEqual(provider.parsePurchaseEvent(event), {
                    memberId: 'm1',
                    bookId: 'b1',
                    providerPaymentId: 'pi_123',
                    amountCents: 599,
                    currency: 'usd'
                });
            });
        });
    });

    describe('PayPalProvider', function () {
        it('extends PaymentProviderBase', function () {
            assert.ok(new PayPalProvider() instanceof PaymentProviderBase);
        });

        it('defaults to sandbox mode for safety', function () {
            assert.equal(new PayPalProvider({}).sandbox, true);
        });

        it('is unavailable without all three credentials', function () {
            assert.equal(new PayPalProvider({clientId: 'x', clientSecret: 'y'}).isAvailable(), false);
        });

        it('is available when fully configured', function () {
            const provider = new PayPalProvider({clientId: 'x', clientSecret: 'y', webhookId: 'z'});
            assert.equal(provider.isAvailable(), true);
        });

        describe('parsePurchaseEvent', function () {
            const provider = new PayPalProvider({clientId: 'x', clientSecret: 'y', webhookId: 'z'});

            it('returns null for unrelated events', function () {
                assert.equal(provider.parsePurchaseEvent({event_type: 'CHECKOUT.ORDER.APPROVED'}), null);
            });

            it('returns null when the capture status is not COMPLETED', function () {
                const event = {
                    event_type: 'PAYMENT.CAPTURE.COMPLETED',
                    resource: {status: 'DECLINED', custom_id: 'm1:b1'}
                };
                assert.equal(provider.parsePurchaseEvent(event), null);
            });

            it('returns null when custom_id is malformed', function () {
                const event = {
                    event_type: 'PAYMENT.CAPTURE.COMPLETED',
                    resource: {status: 'COMPLETED', custom_id: 'just-one-id', amount: {value: '5.99', currency_code: 'USD'}, id: 'CAP_X'}
                };
                assert.equal(provider.parsePurchaseEvent(event), null);
            });

            it('converts dollar amounts to cents and lowercases the currency', function () {
                const event = {
                    event_type: 'PAYMENT.CAPTURE.COMPLETED',
                    resource: {
                        status: 'COMPLETED',
                        custom_id: 'm1:b1',
                        amount: {value: '5.99', currency_code: 'USD'},
                        id: 'CAP_X'
                    }
                };
                assert.deepEqual(provider.parsePurchaseEvent(event), {
                    memberId: 'm1',
                    bookId: 'b1',
                    providerPaymentId: 'CAP_X',
                    amountCents: 599,
                    currency: 'usd'
                });
            });
        });
    });

    describe('payments facade', function () {
        beforeEach(() => payments.reset());

        it('returns a Stripe instance by name', function () {
            assert.ok(payments.getProvider('stripe') instanceof StripeProvider);
        });

        it('returns a PayPal instance by name', function () {
            assert.ok(payments.getProvider('paypal') instanceof PayPalProvider);
        });

        it('rejects unknown providers', function () {
            assert.throws(() => payments.getProvider('venmo'), /Unknown payment provider/);
        });

        it('caches the same instance across calls', function () {
            assert.equal(payments.getProvider('stripe'), payments.getProvider('stripe'));
        });

        it('listEnabledProviders reports name + availability', function () {
            const enabled = payments.listEnabledProviders();
            assert.ok(Array.isArray(enabled));
            assert.ok(enabled.every(p => typeof p.name === 'string' && typeof p.available === 'boolean'));
        });
    });
});
