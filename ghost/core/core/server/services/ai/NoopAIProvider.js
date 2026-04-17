// # Noop AI provider
//
// Fallback used when nothing is configured. Keeps callers ergonomic —
// they check `isAvailable()` once and skip the feature otherwise.
const AIProviderBase = require('./AIProviderBase');

class NoopAIProvider extends AIProviderBase {
    constructor() {
        super({});
        this.name = 'noop';
    }

    isAvailable() {
        return false;
    }
}

module.exports = NoopAIProvider;
