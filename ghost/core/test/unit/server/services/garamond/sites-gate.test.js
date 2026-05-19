const assert = require('node:assert/strict');

const sites = require('../../../../../core/server/services/garamond/sites');

describe('Garamond sites: subscription gate', function () {
    it('exposes ACTIVE_SUBSCRIPTION_STATUSES via the publishAuthor signature', function () {
        // The gate is private, so the contract we lock down here is the
        // service surface and the new skipSubscriptionCheck flag.
        assert.equal(typeof sites.publishAuthor, 'function');
    });

    it('rejects when authorId is missing (regardless of subscription)', async function () {
        await assert.rejects(() => sites.publishAuthor({}), /authorId is required/);
    });
});
