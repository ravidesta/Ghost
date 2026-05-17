const assert = require('node:assert/strict');

const {
    DEFAULT_PLATFORM_FEE_RATE,
    MARKETPLACE_FEE_RATES,
    calculateSplit,
    invertForRefund,
    grossUpForMarketplace,
    calculateMarketplaceSplit
} = require('../../../../../core/server/services/garamond/royalties/split');

describe('Garamond: royalty split math', function () {
    describe('calculateSplit', function () {
        it('defaults to a 90/10 platform/author split', function () {
            assert.equal(DEFAULT_PLATFORM_FEE_RATE, 0.10);
            const r = calculateSplit({grossCents: 1000});
            assert.deepEqual(r, {grossCents: 1000, platformFeeCents: 100, netCents: 900});
        });

        it('rounds half-up so the platform does not lose a fractional cent', function () {
            const r = calculateSplit({grossCents: 999}); // 999 * 0.10 = 99.9 → 100
            assert.equal(r.platformFeeCents, 100);
            assert.equal(r.netCents, 899);
        });

        it('respects a custom fee rate', function () {
            const r = calculateSplit({grossCents: 1000, feeRate: 0.15});
            assert.equal(r.platformFeeCents, 150);
            assert.equal(r.netCents, 850);
        });

        it('respects a minimum fee floor', function () {
            const r = calculateSplit({grossCents: 100, feeRate: 0.10, minFeeCents: 30});
            assert.equal(r.platformFeeCents, 30);
            assert.equal(r.netCents, 70);
        });

        it('clamps the floor to the gross when the sale is smaller than the floor', function () {
            const r = calculateSplit({grossCents: 20, feeRate: 0.10, minFeeCents: 30});
            assert.equal(r.platformFeeCents, 20);
            assert.equal(r.netCents, 0);
        });

        it('rejects an invalid fee rate', function () {
            assert.throws(() => calculateSplit({grossCents: 100, feeRate: 1.5}), /feeRate/);
            assert.throws(() => calculateSplit({grossCents: 100, feeRate: -0.1}), /feeRate/);
        });

        it('rejects a non-finite gross', function () {
            assert.throws(() => calculateSplit({grossCents: Number.NaN}), /grossCents/);
        });
    });

    describe('invertForRefund', function () {
        it('flips every amount sign so refunds sum back to zero', function () {
            const sale = calculateSplit({grossCents: 1000});
            const refund = invertForRefund(sale);
            assert.equal(sale.grossCents + refund.grossCents, 0);
            assert.equal(sale.platformFeeCents + refund.platformFeeCents, 0);
            assert.equal(sale.netCents + refund.netCents, 0);
        });
    });

    describe('grossUpForMarketplace (iTunes/App Store, etc.)', function () {
        it('returns the input unchanged when the marketplace takes nothing', function () {
            assert.equal(grossUpForMarketplace(599, 0), 599);
        });

        it('grosses up Apple 30% correctly — author still receives base price', function () {
            // 599 / 0.70 = 855.71 → ceil = 856
            const apple = grossUpForMarketplace(599, MARKETPLACE_FEE_RATES.apple);
            assert.equal(apple, 856);
            // sanity check: 856 * 0.70 = 599.2, ceil keeps us safe
            assert.ok(apple * 0.70 >= 599);
        });

        it('handles Google and Amazon at the same 30%', function () {
            assert.equal(grossUpForMarketplace(599, MARKETPLACE_FEE_RATES.google), 856);
            assert.equal(grossUpForMarketplace(599, MARKETPLACE_FEE_RATES.amazon), 856);
        });

        it('rejects a fee rate >= 1 (a marketplace cannot take 100%)', function () {
            assert.throws(() => grossUpForMarketplace(599, 1), /marketplaceFeeRate/);
        });
    });

    describe('calculateMarketplaceSplit', function () {
        it('returns the full breakdown for an Apple sale at the platform default', function () {
            const r = calculateMarketplaceSplit({
                basePriceCents: 599,
                marketplaceFeeRate: MARKETPLACE_FEE_RATES.apple
            });
            assert.equal(r.marketplaceGrossCents, 856);       // what the iTunes buyer pays
            assert.equal(r.marketplaceFeeCents, 257);          // what Apple keeps
            assert.equal(r.grossCents, 599);                    // what Garamond receives
            assert.equal(r.platformFeeCents, 60);               // 10% of $5.99 = $0.60 (rounded)
            assert.equal(r.netCents, 539);                       // author's take-home
        });

        it('matches the web split for the author when no marketplace fee applies', function () {
            const web = calculateSplit({grossCents: 599});
            const market = calculateMarketplaceSplit({basePriceCents: 599, marketplaceFeeRate: 0});
            assert.equal(market.netCents, web.netCents);
            assert.equal(market.marketplaceFeeCents, 0);
        });
    });
});
