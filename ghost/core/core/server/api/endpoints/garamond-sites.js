const errors = require('@tryghost/errors');
const {sites} = require('../../services/garamond');

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
     *
     * Renders and uploads the author's full static site (homepage,
     * books index, series index, per-book pages, per-series pages) and
     * returns the homepage URL plus a count of pages written.
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
    }
};

module.exports = controller;
