// # Mistral provider
//
// Mistral's flagship text models are exceptional at non-English work —
// French, German, Spanish, Italian, Portuguese, Dutch are all native-
// quality. We route the site-copywriting task to Mistral by default
// because most multilingual deploys benefit from it, but the provider
// can serve any text task.
const AIProviderBase = require('./AIProviderBase');

class MistralProvider extends AIProviderBase {
    constructor(config = {}) {
        super(config);
        this.name = 'mistral';
        this.apiKey = config.apiKey;
        this.defaultTextModel = config.defaultTextModel || 'mistral-small-latest';
        this.copywritingModel = config.copywritingModel || 'mistral-large-latest';
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
        const {Mistral} = require('@mistralai/mistralai');
        this._client = new Mistral({apiKey: this.apiKey});
        return this._client;
    }

    async generateText({prompt, system, maxTokens = 1024, model}) {
        const client = this._getClient();
        const chosen = model || this.defaultTextModel;

        const messages = [];
        if (system) {
            messages.push({role: 'system', content: system});
        }
        messages.push({role: 'user', content: prompt});

        const response = await client.chat.complete({
            model: chosen,
            maxTokens,
            messages
        });

        const text = response.choices?.[0]?.message?.content ?? '';
        return {
            text: typeof text === 'string' ? text : Array.isArray(text) ? text.map(t => t.text || '').join('') : '',
            model: chosen,
            usage: response.usage
        };
    }
}

module.exports = MistralProvider;
