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
const membersService = require('../../services/members');

const stripeWebhook = require('./webhooks/stripe');
const paypalWebhook = require('./webhooks/paypal');
const memberDownload = require('./routes/download');
const startCheckout = require('./routes/checkout');

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

    // Member-facing gated download — requires an authenticated member session
    app.get(
        '/books/:id/download',
        membersService.middleware.loadMemberSession,
        memberDownload
    );

    // Start a checkout for a paid book
    app.post(
        '/books/:id/checkout',
        bodyParser.json({limit: '1mb'}),
        membersService.middleware.loadMemberSession,
        startCheckout
    );

    app.use('/webhooks', errorHandler.resourceNotFound);
    app.use('/webhooks', errorHandler.handleJSONResponse(sentry));
    app.use('/books', errorHandler.resourceNotFound);
    app.use('/books', errorHandler.handleJSONResponse(sentry));

    debug('Garamond app setup end');
    return app;
};
