// # AI Provider base class
//
// All AI providers (OpenAI, Anthropic, Azure, …) extend this class so the
// task router can pick whichever one is best for a job without callers
// caring which vendor or model ran the inference. Keep this surface small —
// providers pick the right underlying model per capability.

class AIProviderBase {
    constructor(config = {}) {
        this.config = config;
        this.name = 'base';
    }

    /**
     * Whether this provider has the credentials it needs to take requests.
     * @returns {boolean}
     */
    isAvailable() {
        return false;
    }

    /**
     * Generate text (copyedit, summary, marketing copy, chapter outline, …).
     *
     * @param {Object} args
     * @param {string} args.prompt
     * @param {string} [args.system]
     * @param {number} [args.maxTokens=1024]
     * @param {string} [args.model]
     * @returns {Promise<{text: string, model: string, usage?: Object}>}
     */
    async generateText(_args) {
        throw new Error(`${this.name}: generateText not implemented`);
    }

    /**
     * Generate an image (covers, watercolor accents, drop-cap flourishes).
     *
     * @param {Object} args
     * @param {string} args.prompt
     * @param {string} [args.size='1024x1024']
     * @param {string} [args.style]
     * @param {string} [args.model]
     * @returns {Promise<{url?: string, b64?: string, model: string}>}
     */
    async generateImage(_args) {
        throw new Error(`${this.name}: generateImage not implemented`);
    }

    /**
     * Whether this provider supports image generation. Most LLM providers
     * only do text; the router checks this when picking a provider for an
     * image task.
     * @returns {boolean}
     */
    supportsImages() {
        return false;
    }
}

module.exports = AIProviderBase;
