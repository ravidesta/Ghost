const errors = require('@tryghost/errors');
const {sites, ai} = require('../../services/garamond');

// TODO(garamond): swap to `permissions: true` once the populate-permissions
// migration adds a `garamond_site` permission. mw.authAdminApi already
// restricts these to admin users.
const PUBLIC = false;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'garamond_sites',

    /**
     * POST /sites/publish
     * Body: { sites: [{ authorId, fontPairingId? }] }
     */
    publish: {
        statusCode: 201,
        headers: {cacheInvalidate: false},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data?.sites?.[0];
            if (!payload || !payload.authorId) {
                throw new errors.BadRequestError({message: 'authorId is required.'});
            }
            const result = await sites.publishAuthor({
                authorId: payload.authorId,
                fontPairingId: payload.fontPairingId
            });
            return {site: result};
        }
    },

    /**
     * POST /sites/copy
     * Body: { sites: [{ authorName, seed, bookSeed?, language? }] }
     *
     * Generates author bio / tagline / about / (optional) book blurb in
     * the requested language. Multilingual by design — defaults route
     * through Mistral when configured, falling back to Claude / GPT.
     */
    copy: {
        statusCode: 200,
        headers: {cacheInvalidate: false},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data?.sites?.[0];
            if (!payload || !payload.authorName || !payload.seed) {
                throw new errors.BadRequestError({message: 'authorName and seed are required.'});
            }
            const result = await ai.siteCopy({
                authorName: payload.authorName,
                seed: payload.seed,
                bookSeed: payload.bookSeed,
                language: payload.language,
                model: payload.model
            });
            return {site_copy: result};
        }
    }
};

module.exports = controller;
