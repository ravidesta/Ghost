const errors = require('@tryghost/errors');
const {marketplace} = require('../../services/garamond');

// TODO(garamond): swap to `permissions: true` once a populate-permissions
// migration adds a `marketplace` permission. mw.authAdminApi already
// gates these to admin users.
const PUBLIC = false;

function _payload(frame) {
    return frame.data?.offers?.[0] || {};
}

function _currentUserId(frame) {
    return frame.options?.context?.user || null;
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'offers',

    browse: {
        headers: {cacheInvalidate: false},
        options: ['status', 'authorId', 'providerId', 'kind'],
        permissions: PUBLIC,
        async query(frame) {
            const rows = await marketplace.listOffers({
                status: frame.options.status,
                authorId: frame.options.authorId,
                providerId: frame.options.providerId,
                kind: frame.options.kind
            });
            return {offers: rows};
        }
    },

    read: {
        headers: {cacheInvalidate: false},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            return {offers: [await marketplace.getOffer(frame.options.id)]};
        }
    },

    /**
     * POST /marketplace/offers
     * Body: { offers: [{ authorId?, kind, title, description?, budgetCents,
     *                    currency?, bookId?, deadline?, platformFeePct?,
     *                    paymentProvider? }] }
     * authorId defaults to the current admin user so a writer-author
     * posting their own job does not have to pass it explicitly.
     */
    add: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const row = await marketplace.postOffer({
                authorId: payload.authorId || _currentUserId(frame),
                kind: payload.kind,
                title: payload.title,
                description: payload.description,
                budgetCents: payload.budgetCents,
                currency: payload.currency,
                bookId: payload.bookId,
                deadline: payload.deadline,
                platformFeePct: payload.platformFeePct,
                paymentProvider: payload.paymentProvider
            });
            return {offers: [row]};
        }
    },

    /** POST /marketplace/offers/:id/fund */
    fund: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const row = await marketplace.fundOffer({
                offerId: frame.options.id,
                authorId: payload.authorId || _currentUserId(frame),
                fundingReference: payload.fundingReference,
                paymentProvider: payload.paymentProvider
            });
            return {offers: [row]};
        }
    },

    /** POST /marketplace/offers/:id/claim */
    claim: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const row = await marketplace.claimOffer({
                offerId: frame.options.id,
                providerId: payload.providerId || _currentUserId(frame)
            });
            return {offers: [row]};
        }
    },

    /** POST /marketplace/offers/:id/start */
    start: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const row = await marketplace.startOffer({
                offerId: frame.options.id,
                providerId: payload.providerId || _currentUserId(frame)
            });
            return {offers: [row]};
        }
    },

    /** POST /marketplace/offers/:id/deliver */
    deliver: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const row = await marketplace.deliverOffer({
                offerId: frame.options.id,
                providerId: payload.providerId || _currentUserId(frame),
                deliveryNotes: payload.deliveryNotes
            });
            return {offers: [row]};
        }
    },

    /** POST /marketplace/offers/:id/accept — triggers the payout */
    accept: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const row = await marketplace.acceptOffer({
                offerId: frame.options.id,
                authorId: payload.authorId || _currentUserId(frame)
            });
            return {offers: [row]};
        }
    },

    /** POST /marketplace/offers/:id/dispute */
    dispute: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const actorId = payload.actorId || _currentUserId(frame);
            if (!actorId) {
                throw new errors.BadRequestError({message: 'actorId is required.'});
            }
            const row = await marketplace.disputeOffer({
                offerId: frame.options.id,
                actorId,
                reason: payload.reason
            });
            return {offers: [row]};
        }
    },

    /** POST /marketplace/offers/:id/cancel */
    cancel: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = _payload(frame);
            const row = await marketplace.cancelOffer({
                offerId: frame.options.id,
                actorId: payload.actorId || _currentUserId(frame)
            });
            return {offers: [row]};
        }
    }
};

module.exports = controller;
