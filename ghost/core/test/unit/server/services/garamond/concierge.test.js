const assert = require('node:assert/strict');

const {buildSystemPrompt, _formatMemory, _formatCatalog, _formatBalance} =
    require('../../../../../core/server/services/garamond/concierge/system-prompt');
const {parseMemoryTags} =
    require('../../../../../core/server/services/garamond/concierge/memory-tags');

describe('Garamond concierge: system prompt', function () {
    it('mentions the platform and the role', function () {
        const prompt = buildSystemPrompt({author: {name: 'Jane'}});
        assert.match(prompt, /Garamond/);
        assert.match(prompt, /concierge/i);
    });

    it('formats remembered facts as a bulleted list', function () {
        const out = _formatMemory([
            {key: 'pace', value: '2 books per year'},
            {key: 'tone', value: 'literary noir'}
        ]);
        assert.match(out, /- pace: 2 books per year/);
        assert.match(out, /- tone: literary noir/);
    });

    it('says "no remembered facts" when the memory is empty', function () {
        assert.match(_formatMemory([]), /no remembered facts/);
    });

    it('lists books with price and status', function () {
        const out = _formatCatalog(
            [{title: 'The Keeper', price_cents: 599, status: 'published', series_position: 1}],
            []
        );
        assert.match(out, /The Keeper/);
        assert.match(out, /\$5\.99/);
        assert.match(out, /published/);
        assert.match(out, /\[book 1\]/);
    });

    it('marks free books as free', function () {
        const out = _formatCatalog([{title: 'X', price_cents: null, status: 'published'}], []);
        assert.match(out, /\(free\)/);
    });

    it('lists pending balance by currency', function () {
        assert.match(_formatBalance({usd: 53900}), /USD: \$539\.00/);
        assert.match(_formatBalance({usd: 53900, eur: 12000}), /EUR: \$120\.00/);
    });

    it('explains the REMEMBER tag so the model knows to use it', function () {
        const prompt = buildSystemPrompt({author: {name: 'x'}});
        assert.match(prompt, /\[\[REMEMBER:/);
    });
});

describe('Garamond concierge: memory tag parser', function () {
    it('extracts a single REMEMBER tag and returns stripped text', function () {
        const {strippedText, facts} = parseMemoryTags(
            'Good plan. [[REMEMBER: current-project=The Lighthouse, book 3]]'
        );
        assert.equal(strippedText, 'Good plan.');
        assert.deepEqual(facts, [{key: 'current-project', value: 'The Lighthouse, book 3'}]);
    });

    it('extracts multiple tags in one reply', function () {
        const {facts} = parseMemoryTags(
            'Okay. [[REMEMBER: pace=2 per year]] [[REMEMBER: tone=quiet]]'
        );
        assert.equal(facts.length, 2);
        const keys = facts.map(f => f.key).sort();
        assert.deepEqual(keys, ['pace', 'tone']);
    });

    it('de-duplicates so the last write wins', function () {
        const {facts} = parseMemoryTags(
            '[[REMEMBER: pace=1 per year]] later... [[REMEMBER: pace=2 per year]]'
        );
        assert.equal(facts.length, 1);
        assert.equal(facts[0].value, '2 per year');
    });

    it('lowercases keys', function () {
        const {facts} = parseMemoryTags('[[REMEMBER: Current-Project=x]]');
        assert.equal(facts[0].key, 'current-project');
    });

    it('returns no facts when the response has no tags', function () {
        const {strippedText, facts} = parseMemoryTags('Plain reply, no tags.');
        assert.equal(strippedText, 'Plain reply, no tags.');
        assert.deepEqual(facts, []);
    });

    it('handles non-string input gracefully', function () {
        assert.deepEqual(parseMemoryTags(null), {strippedText: '', facts: []});
        assert.deepEqual(parseMemoryTags(undefined), {strippedText: '', facts: []});
    });
});
