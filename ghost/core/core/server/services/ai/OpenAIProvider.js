// # OpenAI provider
//
// Talks to api.openai.com via the `openai` SDK. Default text model and
// default image model are config-driven so a deploy can pick a faster /
// cheaper model per task without touching code.
const AIProviderBase = require('./AIProviderBase');

class OpenAIProvider extends AIProviderBase {
    constructor(config = {}) {
        super(config);
        this.name = 'openai';
        this.apiKey = config.apiKey;
        this.defaultTextModel = config.defaultTextModel || 'gpt-4o-mini';
        this.defaultImageModel = config.defaultImageModel || 'gpt-image-1';
        this.organization = config.organization;
    }

    isAvailable() {
        return Boolean(this.apiKey);
    }

    supportsImages() {
        return Boolean(this.defaultImageModel);
    }

    _getClient() {
        if (this._client) {
            return this._client;
        }
        const OpenAI = require('openai');
        this._client = new OpenAI({
            apiKey: this.apiKey,
            organization: this.organization
        });
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

        const response = await client.chat.completions.create({
            model: chosen,
            messages,
            max_tokens: maxTokens
        });

        return {
            text: response.choices?.[0]?.message?.content ?? '',
            model: chosen,
            usage: response.usage
        };
    }

    async generateImage({prompt, size = '1024x1024', style, model}) {
        const client = this._getClient();
        const chosen = model || this.defaultImageModel;

        const response = await client.images.generate({
            model: chosen,
            prompt,
            size,
            style,
            n: 1
        });

        const first = response.data?.[0] ?? {};
        return {
            url: first.url,
            b64: first.b64_json,
            model: chosen
        };
    }
}

module.exports = OpenAIProvider;
