const assert = require('node:assert/strict');

const siteCopy = require('../../../../../core/server/services/garamond/ai/tasks/site-copy');
const MistralProvider = require('../../../../../core/server/services/ai/MistralProvider');
const AIProviderBase = require('../../../../../core/server/services/ai/AIProviderBase');

describe('Garamond AI: site copy task', function () {
    describe('arg validation', function () {
        it('requires authorName and seed', async function () {
            await assert.rejects(() => siteCopy({}), /authorName and seed/);
            await assert.rejects(() => siteCopy({authorName: 'x'}), /authorName and seed/);
            await assert.rejects(() => siteCopy({seed: 'x'}), /authorName and seed/);
        });

        it('rejects unsupported languages', async function () {
            await assert.rejects(
                () => siteCopy({authorName: 'x', seed: 'y', language: 'klingon'}),
                /unsupported language/
            );
        });

        it('accepts every advertised language', function () {
            for (const lang of siteCopy.SUPPORTED_LANGUAGES) {
                const sys = siteCopy._systemPrompt(lang);
                assert.ok(sys.length > 0, `system prompt for ${lang} should be non-empty`);
            }
        });
    });

    describe('language naming in the system prompt', function () {
        it('names French explicitly when language=fr', function () {
            assert.match(siteCopy._systemPrompt('fr'), /French/);
        });

        it('names German explicitly when language=de', function () {
            assert.match(siteCopy._systemPrompt('de'), /German/);
        });

        it('names Spanish explicitly when language=es', function () {
            assert.match(siteCopy._systemPrompt('es'), /Spanish/);
        });

        it('asks for JSON output explicitly', function () {
            assert.match(siteCopy._systemPrompt('en'), /JSON/);
        });
    });

    describe('user prompt', function () {
        it('includes author name and seed', function () {
            const p = siteCopy._userPrompt({authorName: 'Jane', seed: 'Quiet stories about sea-towns.'});
            assert.match(p, /Jane/);
            assert.match(p, /sea-towns/);
        });

        it('appends a book seed when supplied', function () {
            const p = siteCopy._userPrompt({
                authorName: 'Jane',
                seed: 'Quiet stories.',
                bookSeed: 'A lighthouse keeper meets a ghost.'
            });
            assert.match(p, /lighthouse keeper meets a ghost/);
        });
    });

    describe('JSON parser', function () {
        it('strips ```json fences', function () {
            assert.deepEqual(
                siteCopy._safeParseJson('```json\n{"bio":"hi"}\n```'),
                {bio: 'hi'}
            );
        });

        it('returns null on bad JSON', function () {
            assert.equal(siteCopy._safeParseJson('not json'), null);
        });
    });
});

describe('Garamond AI: MistralProvider', function () {
    it('extends AIProviderBase', function () {
        assert.ok(new MistralProvider() instanceof AIProviderBase);
    });

    it('is unavailable without an apiKey', function () {
        assert.equal(new MistralProvider({}).isAvailable(), false);
    });

    it('never supports images', function () {
        assert.equal(new MistralProvider({apiKey: 'k'}).supportsImages(), false);
    });

    it('defaults to mistral-small-latest for text and mistral-large-latest for copywriting', function () {
        const provider = new MistralProvider({apiKey: 'k'});
        assert.equal(provider.defaultTextModel, 'mistral-small-latest');
        assert.equal(provider.copywritingModel, 'mistral-large-latest');
    });
});
