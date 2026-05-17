// # Garamond — start a checkout
//
// POST /garamond/books/:id/checkout
// Body: {provider: 'stripe' | 'paypal', returnUrl?, cancelUrl?}
//
// Originates a payment flow for the current member. Returns the URL the
// browser should send the buyer to.
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const {payments} = require('../../../services/garamond');

function defaultUrl(book, suffix) {
    const siteUrl = (config.getSiteUrl() || '').replace(/\/+$/, '');
    return `${siteUrl}/garamond/books/${book.id}/${suffix}`;
}

module.exports = async function startCheckout(req, res, next) {
    try {
        if (!req.member || !req.member.id) {
            return res.status(401).json({error: 'sign_in_required'});
        }

        const bookId = req.params.id;
        const providerName = (req.body && req.body.provider) || 'stripe';

        const models = require('../../../models');
        const book = await models.Book.findOne({id: bookId}, {require: false});
        if (!book) {
            return res.status(404).json({error: 'not_found'});
        }
        if (book.get('status') !== 'published') {
            return res.status(409).json({error: 'not_published'});
        }
        if (!book.get('price_cents')) {
            return res.status(409).json({error: 'free_book'});
        }

        let provider;
        try {
            provider = payments.getProvider(providerName);
        } catch {
            return res.status(400).json({error: 'unknown_provider'});
        }
        if (!provider.isAvailable()) {
            return res.status(503).json({error: 'provider_not_configured'});
        }

        const bookJson = book.toJSON();
        const memberJson = {id: req.member.id, email: req.member.email};

        const returnUrl = (req.body && req.body.returnUrl) || defaultUrl(bookJson, 'success');
        const cancelUrl = (req.body && req.body.cancelUrl) || defaultUrl(bookJson, 'cancel');

        const {redirectUrl, providerSessionId} = await provider.createCheckout({
            book: bookJson,
            member: memberJson,
            returnUrl,
            cancelUrl
        });

        return res.status(200).json({
            provider: providerName,
            redirectUrl,
            providerSessionId
        });
    } catch (err) {
        logging.error({err, message: 'garamond: checkout origination failed'});
        // Surface provider-side errors as 502 so the buyer UI can retry vs
        // showing a generic 500.
        if (err && /paypal:|stripe:/.test(err.message || '')) {
            return next(new errors.BadGatewayError({err}));
        }
        return next(err);
    }
};
