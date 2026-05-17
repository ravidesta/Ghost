// # Garamond payments
//
// Picks payment providers based on config and returns a single shared
// instance per provider. Callers ask for one explicitly (so a "buy with
// PayPal" button knows what to wire) — there is no "active" provider.
//
// Config shape:
//   garamond:
//     payments:
//       enabled: ['stripe', 'paypal']
//       stripe: {apiKey, webhookSecret}
//       paypal: {clientId, clientSecret, webhookId, sandbox: true}
const config = require('../../../../shared/config');

const PaymentProviderBase = require('./payment-provider-base');
const StripeProvider = require('./stripe-provider');
const PayPalProvider = require('./paypal-provider');

const PROVIDERS = {
    stripe: StripeProvider,
    paypal: PayPalProvider
};

const instances = {};

function getProvider(name) {
    if (!PROVIDERS[name]) {
        throw new Error(`Unknown payment provider: ${name}`);
    }
    if (!instances[name]) {
        const paymentsConfig = config.get('garamond')?.payments || {};
        instances[name] = new PROVIDERS[name](paymentsConfig[name] || {});
    }
    return instances[name];
}

function listEnabledProviders() {
    const paymentsConfig = config.get('garamond')?.payments || {};
    const enabled = Array.isArray(paymentsConfig.enabled) ? paymentsConfig.enabled : ['stripe'];
    return enabled.filter(name => PROVIDERS[name]).map(name => ({
        name,
        available: getProvider(name).isAvailable()
    }));
}

function reset() {
    for (const key of Object.keys(instances)) {
        delete instances[key];
    }
}

module.exports = {
    getProvider,
    listEnabledProviders,
    reset,
    PaymentProviderBase
};
