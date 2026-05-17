const assert = require('node:assert/strict');

const storefront = require('../../../../../core/server/services/garamond/storefront');

describe('Garamond: storefront facade', function () {
    it('exposes the storefront API surface', function () {
        assert.equal(typeof storefront.hasAccess, 'function');
        assert.equal(typeof storefront.recordPurchase, 'function');
        assert.equal(typeof storefront.refundPurchase, 'function');
        assert.equal(typeof storefront.listPurchases, 'function');
    });

    describe('hasAccess', function () {
        it('returns false when memberId is missing', async function () {
            assert.equal(await storefront.hasAccess({memberId: null, bookId: 'b'}), false);
        });

        it('returns false when bookId is missing', async function () {
            assert.equal(await storefront.hasAccess({memberId: 'm', bookId: null}), false);
        });
    });

    describe('recordPurchase', function () {
        it('rejects when memberId is missing', async function () {
            await assert.rejects(
                () => storefront.recordPurchase({memberId: null, bookId: 'b', amountCents: 0}),
                /memberId and bookId are required/
            );
        });

        it('rejects when bookId is missing', async function () {
            await assert.rejects(
                () => storefront.recordPurchase({memberId: 'm', bookId: null, amountCents: 0}),
                /memberId and bookId are required/
            );
        });
    });
});
