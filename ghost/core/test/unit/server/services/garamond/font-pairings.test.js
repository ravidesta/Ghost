const assert = require('node:assert/strict');

const {FONT_PAIRINGS, getPairing, listPairings} = require('../../../../../core/server/services/garamond/font-pairings');

describe('Garamond: font pairings', function () {
    it('exposes a non-empty catalogue', function () {
        assert.ok(FONT_PAIRINGS.length > 0);
    });

    it('gives every pairing a stable id, display name, and the two required fonts', function () {
        for (const pairing of FONT_PAIRINGS) {
            assert.match(pairing.id, /^[a-z0-9-]+$/, `id should be kebab-case: ${pairing.id}`);
            assert.ok(pairing.name, `missing name for ${pairing.id}`);
            assert.ok(pairing.headingFont, `missing headingFont for ${pairing.id}`);
            assert.ok(pairing.bodyFont, `missing bodyFont for ${pairing.id}`);
            assert.ok(['classic', 'modern', 'creative'].includes(pairing.group), `unknown group for ${pairing.id}`);
        }
    });

    it('uses unique ids', function () {
        const ids = FONT_PAIRINGS.map(p => p.id);
        assert.equal(new Set(ids).size, ids.length);
    });

    it('includes the house pairing (The Sorbonne: Garamond + Lato)', function () {
        const sorbonne = getPairing('the-sorbonne');
        assert.ok(sorbonne);
        assert.equal(sorbonne.headingFont, 'EB Garamond');
        assert.equal(sorbonne.bodyFont, 'Lato');
    });

    it('returns undefined for unknown ids', function () {
        assert.equal(getPairing('nope'), undefined);
    });

    it('filters by group', function () {
        const modern = listPairings('modern');
        assert.ok(modern.length > 0);
        assert.ok(modern.every(p => p.group === 'modern'));
    });

    it('returns the full list when no group is given', function () {
        assert.equal(listPairings().length, FONT_PAIRINGS.length);
    });
});
