// # Azure AI provider (stub)
//
// Talks to Azure OpenAI deployments. Lazy-loads the SDK so the rest of Ghost
// boots fine when the `openai` package isn't installed.
//
// Config (`ai.azure`):
//   - endpoint: https://<resource>.openai.azure.com
//   - apiKey: Azure OpenAI API key (or use managed identity in production)
//   - apiVersion: e.g. '2024-10-21'
//   - deployments: { text: 'gpt-4o', image: 'dall-e-3' }
const AIProviderBase = require('./AIProviderBase');

class AzureAIProvider extends AIProviderBase {
    constructor(config = {}) {
        super(config);
        this.name = 'azure';
        this.endpoint = config.endpoint;
        this.apiKey = config.apiKey;
        this.apiVersion = config.apiVersion || '2024-10-21';
        this.deployments = config.deployments || {};
    }

    isAvailable() {
        return Boolean(this.endpoint && this.apiKey && this.deployments.text);
    }

    _getClient() {
        if (this._client) {
            return this._client;
        }
        const {AzureOpenAI} = require('openai');
        this._client = new AzureOpenAI({
            endpoint: this.endpoint,
            apiKey: this.apiKey,
            apiVersion: this.apiVersion
        });
        return this._client;
    }

    async generateText({prompt, system, maxTokens = 1024, model}) {
        const client = this._getClient();
        const deployment = model || this.deployments.text;

        const messages = [];
        if (system) {
            messages.push({role: 'system', content: system});
        }
        messages.push({role: 'user', content: prompt});

        const response = await client.chat.completions.create({
            model: deployment,
            messages,
            max_tokens: maxTokens
        });

        return {text: response.choices?.[0]?.message?.content ?? ''};
    }

    async generateImage({prompt, size = '1024x1024', style}) {
        const client = this._getClient();
        const deployment = this.deployments.image;
        if (!deployment) {
            throw new Error('azure: image deployment is not configured');
        }

        const response = await client.images.generate({
            model: deployment,
            prompt,
            size,
            style,
            n: 1
        });

        const first = response.data?.[0] ?? {};
        if (first.url) {
            return {url: first.url};
        }
        return {b64: first.b64_json};
    }
}

module.exports = AzureAIProvider;
