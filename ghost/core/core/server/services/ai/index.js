// # AI service
//
// Picks a provider based on config and returns a single shared instance.
//
// Config shape:
//   ai: {
//     active: 'azure' | 'noop',
//     azure: { endpoint, apiKey, apiVersion, deployments: { text, image } }
//   }
const config = require('../../../shared/config');
const AzureAIProvider = require('./AzureAIProvider');
const NoopAIProvider = require('./NoopAIProvider');

const PROVIDERS = {
    azure: AzureAIProvider,
    noop: NoopAIProvider
};

let instance;

function getProvider() {
    if (instance) {
        return instance;
    }

    const aiConfig = config.get('ai') || {};
    const active = aiConfig.active || 'noop';
    const Provider = PROVIDERS[active] || NoopAIProvider;
    instance = new Provider(aiConfig[active] || {});
    return instance;
}

function reset() {
    instance = null;
}

module.exports = {
    getProvider,
    reset,
    AIProviderBase: require('./AIProviderBase')
};
