const errors = require('@tryghost/errors');
const {concierge} = require('../../services/garamond');

// TODO(garamond): swap to `permissions: true` once a populate-permissions
// migration adds a concierge permission. mw.authAdminApi already restricts
// to admin users.
const PUBLIC = false;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'garamond_concierge',

    /**
     * POST /concierge/chat
     * Body: { concierge: [{ authorId, message, model? }] }
     */
    chat: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data?.concierge?.[0];
            if (!payload || !payload.authorId || !payload.message) {
                throw new errors.BadRequestError({message: 'authorId and message are required.'});
            }
            const result = await concierge.chat({
                authorId: payload.authorId,
                message: payload.message,
                model: payload.model
            });
            return {concierge: result};
        }
    },

    /**
     * GET /concierge/memory?authorId=...
     * Returns every remembered fact for the author so a memory-inspector
     * UI can show and edit what the concierge thinks it knows.
     */
    memory: {
        headers: {cacheInvalidate: false},
        options: ['authorId'],
        validation: {options: {authorId: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const facts = await concierge.getMemory(frame.options.authorId);
            return {memory: facts};
        }
    },

    /**
     * PUT /concierge/memory
     * Body: { concierge: [{ authorId, key, value }] }
     * Author-curated facts (vs ones the concierge inferred).
     */
    setMemory: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data?.concierge?.[0];
            if (!payload || !payload.authorId || !payload.key) {
                throw new errors.BadRequestError({message: 'authorId and key are required.'});
            }
            const fact = await concierge.setMemory({
                authorId: payload.authorId,
                key: payload.key,
                value: payload.value
            });
            return {memory: fact};
        }
    }
};

module.exports = controller;
