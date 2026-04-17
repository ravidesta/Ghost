const assert = require('node:assert/strict');

const AIProviderBase = require('../../../../../core/server/services/ai/AIProviderBase');
const AzureAIProvider = require('../../../../../core/server/services/ai/AzureAIProvider');
const NoopAIProvider = require('../../../../../core/server/services/ai/NoopAIProvider');

describe('AI: providers', function () {
    describe('NoopAIProvider', function () {
        it('is never available', function () {
            assert.equal(new NoopAIProvider().isAvailable(), false);
        });

        it('extends AIProviderBase', function () {
            assert.ok(new NoopAIProvider() instanceof AIProviderBase);
        });
    });

    describe('AzureAIProvider', function () {
        it('is unavailable without config', function () {
            assert.equal(new AzureAIProvider().isAvailable(), false);
        });

        it('is unavailable without a text deployment', function () {
            const provider = new AzureAIProvider({
                endpoint: 'https://example.openai.azure.com',
                apiKey: 'k'
            });
            assert.equal(provider.isAvailable(), false);
        });

        it('is available when fully configured', function () {
            const provider = new AzureAIProvider({
                endpoint: 'https://example.openai.azure.com',
                apiKey: 'k',
                deployments: {text: 'gpt-4o'}
            });
            assert.equal(provider.isAvailable(), true);
        });

        it('defaults the api version', function () {
            const provider = new AzureAIProvider({apiKey: 'k'});
            assert.ok(provider.apiVersion);
        });
    });
});
