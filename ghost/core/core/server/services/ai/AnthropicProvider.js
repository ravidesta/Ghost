// # Anthropic provider (Claude)
//
// Claude is the recommended provider for copyedit, summarisation, and
// long-form transforms because its instruction-following and editing
// behaviour is excellent. Defaults bias to the cheap fast model
// (haiku-4-5); the task router can request sonnet/opus per task.
const AIProviderBase = require('./AIProviderBase');

class AnthropicProvider extends AIProviderBase {
    constructor(config = {}) {
        super(config);
        this.name = 'anthropic';
        this.apiKey = config.apiKey;
        // Sensible defaults for the Claude 4 family.
        this.defaultTextModel = config.defaultTextModel || 'claude-haiku-4-5-20251001';
        this.copyeditModel = config.copyeditModel || 'claude-sonnet-4-6';
        this.maxRetries = config.maxRetries ?? 2;
    }

    isAvailable() {
        return Boolean(this.apiKey);
    }

    supportsImages() {
        return false;
    }

    _getClient() {
        if (this._client) {
            return this._client;
        }
        const Anthropic = require('@anthropic-ai/sdk');
        this._client = new Anthropic({
            apiKey: this.apiKey,
            maxRetries: this.maxRetries
        });
        return this._client;
    }

    async generateText({prompt, system, maxTokens = 1024, model}) {
        const client = this._getClient();
        const chosen = model || this.defaultTextModel;

        const params = {
            model: chosen,
            max_tokens: maxTokens,
            messages: [{role: 'user', content: prompt}]
        };
        if (system) {
            params.system = system;
        }

        const response = await client.messages.create(params);

        const text = (response.content || [])
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');

        return {
            text,
            model: chosen,
            usage: response.usage
        };
    }
}

module.exports = AnthropicProvider;
