// # AI service
//
// Multi-provider factory — callers pick a provider explicitly (most code
// goes through the Garamond task router which knows which provider best
// serves each task). Available providers: openai, anthropic, azure, noop.
//
// Config shape:
//   ai:
//     providers:
//       enabled: ['openai', 'anthropic']
//       openai:    {apiKey, defaultTextModel, defaultImageModel}
//       anthropic: {apiKey, defaultTextModel, copyeditModel}
//       azure:     {endpoint, apiKey, apiVersion, deployments: {text, image}}
const config = require('../../../shared/config');

const AIProviderBase = require('./AIProviderBase');
const OpenAIProvider = require('./OpenAIProvider');
const AnthropicProvider = require('./AnthropicProvider');
const AzureAIProvider = require('./AzureAIProvider');
const NoopAIProvider = require('./NoopAIProvider');

const PROVIDERS = {
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
    azure: AzureAIProvider,
    noop: NoopAIProvider
};

const instances = {};

function _aiConfig() {
    return config.get('ai') || {};
}

function getProvider(name) {
    if (!PROVIDERS[name]) {
        throw new Error(`Unknown AI provider: ${name}`);
    }
    if (!instances[name]) {
        const ai = _aiConfig();
        const providerConfig = (ai.providers && ai.providers[name]) || ai[name] || {};
        instances[name] = new PROVIDERS[name](providerConfig);
    }
    return instances[name];
}

function listEnabledProviders() {
    const ai = _aiConfig();
    const enabled = Array.isArray(ai.providers && ai.providers.enabled)
        ? ai.providers.enabled
        : Object.keys(PROVIDERS).filter(name => name !== 'noop');

    return enabled
        .filter(name => PROVIDERS[name])
        .map(name => ({
            name,
            available: getProvider(name).isAvailable(),
            supportsImages: getProvider(name).supportsImages()
        }));
}

function reset() {
    for (const key of Object.keys(instances)) {
        delete instances[key];
    }
}

module.exports = {
    getProvider,
    listEnabledProviders,
    reset,
    AIProviderBase
};
