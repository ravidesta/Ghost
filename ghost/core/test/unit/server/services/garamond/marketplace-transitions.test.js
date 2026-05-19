const assert = require('node:assert/strict');

const {
    assertTransition, isTerminal, TERMINAL
} = require('../../../../../core/server/services/garamond/marketplace/transitions');
const marketplace = require('../../../../../core/server/services/garamond/marketplace');

describe('Garamond marketplace: state transitions', function () {
    describe('happy path', function () {
        it('draft → posted (author)', function () {
            assert.equal(assertTransition('draft', 'post', 'author').to, 'posted');
        });

        it('posted → claimed (provider)', function () {
            assert.equal(assertTransition('posted', 'claim', 'provider').to, 'claimed');
        });

        it('claimed → in_progress (provider)', function () {
            assert.equal(assertTransition('claimed', 'start', 'provider').to, 'in_progress');
        });

        it('in_progress → delivered (provider)', function () {
            assert.equal(assertTransition('in_progress', 'deliver', 'provider').to, 'delivered');
        });

        it('delivered → accepted (author)', function () {
            assert.equal(assertTransition('delivered', 'accept', 'author').to, 'accepted');
        });
    });

    describe('authorisation', function () {
        it('an author cannot claim a posted offer', function () {
            assert.throws(() => assertTransition('posted', 'claim', 'author'), /cannot claim/);
        });

        it('a provider cannot accept a delivered offer', function () {
            assert.throws(() => assertTransition('delivered', 'accept', 'provider'), /cannot accept/);
        });

        it('admin can do anything in the matrix', function () {
            assert.doesNotThrow(() => assertTransition('posted', 'claim', 'admin'));
            assert.doesNotThrow(() => assertTransition('delivered', 'accept', 'admin'));
            assert.doesNotThrow(() => assertTransition('draft', 'cancel', 'admin'));
        });
    });

    describe('terminal states', function () {
        it('marks accepted/disputed/canceled terminal', function () {
            for (const t of ['accepted', 'disputed', 'canceled']) {
                assert.equal(isTerminal(t), true);
                assert.ok(TERMINAL.has(t));
            }
        });

        it('rejects every action from a terminal state', function () {
            for (const t of ['accepted', 'disputed', 'canceled']) {
                assert.throws(() => assertTransition(t, 'deliver', 'provider'), /terminal/);
            }
        });
    });

    describe('disputes and cancellations', function () {
        it('either side can dispute an in_progress offer', function () {
            assert.equal(assertTransition('in_progress', 'dispute', 'author').to, 'disputed');
            assert.equal(assertTransition('in_progress', 'dispute', 'provider').to, 'disputed');
        });

        it('either side can dispute a delivered offer', function () {
            assert.equal(assertTransition('delivered', 'dispute', 'author').to, 'disputed');
            assert.equal(assertTransition('delivered', 'dispute', 'provider').to, 'disputed');
        });

        it('only the author or admin can cancel a posted offer', function () {
            assert.equal(assertTransition('posted', 'cancel', 'author').to, 'canceled');
            assert.throws(() => assertTransition('posted', 'cancel', 'provider'), /cannot cancel/);
        });

        it('a delivered offer cannot be cancelled — it must accept or dispute', function () {
            assert.throws(() => assertTransition('delivered', 'cancel', 'author'), /not allowed/);
        });
    });

    describe('error messages', function () {
        it('names the unknown action in the error', function () {
            assert.throws(() => assertTransition('posted', 'teleport', 'author'), /teleport/);
        });

        it('names the unknown actor', function () {
            assert.throws(() => assertTransition('posted', 'claim', 'unicorn'), /unicorn/);
        });
    });
});

describe('Garamond marketplace: provider share math', function () {
    it('15% default fee leaves the provider with 85%', function () {
        const split = marketplace._calculateProviderShare({budgetCents: 10000, platformFeePct: 15});
        assert.equal(split.feeCents, 1500);
        assert.equal(split.providerCents, 8500);
    });

    it('rounds half-up so the platform never loses a fractional cent', function () {
        const split = marketplace._calculateProviderShare({budgetCents: 9999, platformFeePct: 15});
        // 9999 * 0.15 = 1499.85 → 1500
        assert.equal(split.feeCents, 1500);
        assert.equal(split.providerCents, 8499);
    });

    it('accepts a different fee percentage', function () {
        const split = marketplace._calculateProviderShare({budgetCents: 10000, platformFeePct: 10});
        assert.equal(split.feeCents, 1000);
        assert.equal(split.providerCents, 9000);
    });
});
