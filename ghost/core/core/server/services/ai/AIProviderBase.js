// # AI Provider base class
//
// All AI providers (Azure AI, OpenAI, Anthropic, etc.) extend this class so
// Ghost can swap providers without callers caring. Keep this surface small —
// providers pick the right underlying model per capability.

class AIProviderBase {
    constructor(config = {}) {
        this.config = config;
        this.name = 'base';
    }

    /**
     * Whether this provider is configured and ready to receive requests.
     * @returns {boolean}
     */
    isAvailable() {
        return false;
    }

    /**
     * Generate text (copyedit, summary, marketing copy, chapter outline, etc.).
     * @param {Object} _params
     * @param {string} _params.prompt
     * @param {string} [_params.system]
     * @param {number} [_params.maxTokens]
     * @param {string} [_params.model]
     * @returns {Promise<{text: string}>}
     */
    async generateText(_params) {
        throw new Error(`${this.name}: generateText not implemented`);
    }

    /**
     * Generate an image (covers, watercolor accents, drop-cap flourishes).
     * @param {Object} _params
     * @param {string} _params.prompt
     * @param {string} [_params.size]
     * @param {string} [_params.style]
     * @returns {Promise<{url: string}|{b64: string}>}
     */
    async generateImage(_params) {
        throw new Error(`${this.name}: generateImage not implemented`);
    }
}

module.exports = AIProviderBase;
