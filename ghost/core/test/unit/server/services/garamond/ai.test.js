const assert = require('node:assert/strict');

const ai = require('../../../../../core/server/services/ai');
const AIProviderBase = require('../../../../../core/server/services/ai/AIProviderBase');
const OpenAIProvider = require('../../../../../core/server/services/ai/OpenAIProvider');
const AnthropicProvider = require('../../../../../core/server/services/ai/AnthropicProvider');
const copyedit = require('../../../../../core/server/services/garamond/ai/tasks/copyedit');
const coverImage = require('../../../../../core/server/services/garamond/ai/tasks/cover-image');
const router = require('../../../../../core/server/services/garamond/ai/router');

describe('Garamond AI: provider factory', function () {
    beforeEach(() => ai.reset());

    it('returns an OpenAI instance by name', function () {
        assert.ok(ai.getProvider('openai') instanceof OpenAIProvider);
    });

    it('returns an Anthropic instance by name', function () {
        assert.ok(ai.getProvider('anthropic') instanceof AnthropicProvider);
    });

    it('rejects unknown providers', function () {
        assert.throws(() => ai.getProvider('mystery-model-9'), /Unknown AI provider/);
    });

    it('reports availability + image support per provider', function () {
        const enabled = ai.listEnabledProviders();
        assert.ok(Array.isArray(enabled));
        assert.ok(enabled.every(p => typeof p.name === 'string'
            && typeof p.available === 'boolean'
            && typeof p.supportsImages === 'boolean'));
    });
});

describe('Garamond AI: OpenAIProvider', function () {
    it('extends AIProviderBase', function () {
        assert.ok(new OpenAIProvider() instanceof AIProviderBase);
    });

    it('is unavailable without an apiKey', function () {
        assert.equal(new OpenAIProvider({}).isAvailable(), false);
    });

    it('reports image support when a default image model is configured', function () {
        const provider = new OpenAIProvider({apiKey: 'k', defaultImageModel: 'gpt-image-1'});
        assert.equal(provider.supportsImages(), true);
    });

    it('reports no image support when image model is blanked', function () {
        const provider = new OpenAIProvider({apiKey: 'k', defaultImageModel: ''});
        assert.equal(provider.supportsImages(), false);
    });
});

describe('Garamond AI: AnthropicProvider', function () {
    it('extends AIProviderBase', function () {
        assert.ok(new AnthropicProvider() instanceof AIProviderBase);
    });

    it('defaults to a Claude 4 family model id', function () {
        const provider = new AnthropicProvider({apiKey: 'k'});
        assert.match(provider.defaultTextModel, /^claude-/);
    });

    it('never supports images', function () {
        assert.equal(new AnthropicProvider({apiKey: 'k'}).supportsImages(), false);
    });

    it('is unavailable without an apiKey', function () {
        assert.equal(new AnthropicProvider({}).isAvailable(), false);
    });
});

describe('Garamond AI: copyedit', function () {
    it('requires text', async function () {
        await assert.rejects(() => copyedit({}), /text is required/);
    });

    it('parses a clean JSON response', function () {
        const parsed = copyedit._safeParseJson('[{"original":"a","suggestion":"the","reason":"x"}]');
        assert.equal(parsed.length, 1);
        assert.equal(parsed[0].original, 'a');
    });

    it('strips ```json fences before parsing', function () {
        const parsed = copyedit._safeParseJson('```json\n[{"original":"x","suggestion":"y","reason":"z"}]\n```');
        assert.equal(parsed.length, 1);
    });

    it('returns [] on unparseable output instead of throwing', function () {
        assert.deepEqual(copyedit._safeParseJson('not json at all'), []);
        assert.deepEqual(copyedit._safeParseJson(''), []);
    });

    it('exposes a system prompt that names the editor role', function () {
        assert.match(copyedit.SYSTEM_PROMPT, /line editor/i);
    });
});

describe('Garamond AI: coverImage', function () {
    it('requires a book with a title', async function () {
        await assert.rejects(() => coverImage({book: {}}), /book with a title/);
    });

    it('builds a prompt that includes the title and the style hint', function () {
        const prompt = coverImage._buildPrompt({
            book: {title: 'The Lighthouse Keeper', description: 'A man and a lamp.'},
            style: 'watercolor'
        });
        assert.match(prompt, /The Lighthouse Keeper/);
        assert.match(prompt, /watercolor/i);
        assert.match(prompt, /No text in the image/);
    });

    it('exposes named style recipes', function () {
        assert.equal(typeof coverImage.STYLE_RECIPES.watercolor, 'string');
        assert.equal(typeof coverImage.STYLE_RECIPES['literary-noir'], 'string');
    });

    it('uses the KDP 2:3 aspect ratio by default', function () {
        assert.equal(coverImage.KDP_SIZE, '1024x1536');
    });
});

describe('Garamond AI: router', function () {
    it('rejects unknown tasks', function () {
        assert.throws(() => router.resolveProvider('write-the-novel-for-me'), /Unknown AI task/);
    });

    it('returns kind=image for image tasks and kind=text for text tasks', function () {
        assert.equal(router.KNOWN_TASKS.copyedit.kind, 'text');
        assert.equal(router.KNOWN_TASKS.coverImage.kind, 'image');
    });
});
