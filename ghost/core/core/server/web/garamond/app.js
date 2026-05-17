// # Garamond web app
//
// Public-facing routes for the Garamond product surface — currently the
// payment-provider webhooks. Mounted at `/garamond` from the frontend app,
// so the live URLs are:
//
//   POST /garamond/webhooks/stripe
//   POST /garamond/webhooks/paypal
//
// We intentionally do not put bodyParser.json() globally — Stripe needs the
// raw body to verify the signature. Each webhook handler attaches its own
// body parser.
const debug = require('@tryghost/debug')('garamond');
const bodyParser = require('body-parser');
const express = require('../../../shared/express');
const errorHandler = require('@tryghost/mw-error-handler');
const sentry = require('../../../shared/sentry');
const shared = require('../shared');

const stripeWebhook = require('./webhooks/stripe');
const paypalWebhook = require('./webhooks/paypal');

/**
 * @returns {import('express').Application}
 */
module.exports = function setupGaramondApp() {
    debug('Garamond app setup start');
    const app = express('garamond');

    app.use(shared.middleware.cacheControl('private'));

    // Stripe — raw body required for signature verification
    app.post(
        '/webhooks/stripe',
        bodyParser.raw({type: 'application/json'}),
        stripeWebhook
    );

    // PayPal — JSON body, signature headers verified separately
    app.post(
        '/webhooks/paypal',
        bodyParser.json({limit: '1mb'}),
        paypalWebhook
    );

    app.use('/webhooks', errorHandler.resourceNotFound);
    app.use('/webhooks', errorHandler.handleJSONResponse(sentry));

    debug('Garamond app setup end');
    return app;
};
