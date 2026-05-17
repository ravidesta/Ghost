// # Copyedit task
//
// Runs a focused line-edit pass over a chapter. The system prompt biases
// for minimum-touch suggestions and a structured JSON response so callers
// can apply or reject changes one at a time. Defaults route through the
// router — typically Claude.
const {resolveProvider} = require('../router');

const SYSTEM_PROMPT = [
    'You are a careful line editor for a publishing platform.',
    'Review the user\'s text and produce up to N concrete suggestions.',
    'Rules:',
    '- Preserve the author\'s voice and intent.',
    '- Only flag clear issues: typos, dropped articles, wrong-word substitutions,',
    '  repeated words, comma splices, awkward phrasings.',
    '- Skip stylistic preferences unless they hurt clarity.',
    '- Return a JSON array of objects with keys {original, suggestion, reason}.',
    '- Each "original" must be an exact substring of the input.'
].join('\n');

/**
 * @param {Object} args
 * @param {string} args.text
 * @param {number} [args.maxSuggestions=12]
 * @param {string} [args.model]  override the router's model pick
 */
async function copyedit({text, maxSuggestions = 12, model}) {
    if (!text || typeof text !== 'string') {
        throw new Error('copyedit: text is required');
    }

    const {provider} = resolveProvider('copyedit');
    if (!provider) {
        throw new Error('copyedit: no AI provider is configured');
    }

    const prompt = `Return at most ${maxSuggestions} suggestions as a JSON array.\n\nTEXT:\n${text}`;
    const result = await provider.generateText({
        system: SYSTEM_PROMPT,
        prompt,
        maxTokens: 2048,
        model
    });

    return {
        provider: provider.name,
        model: result.model,
        suggestions: _safeParseJson(result.text)
    };
}

function _safeParseJson(raw) {
    if (!raw) {
        return [];
    }
    // Strip ```json fences if the model added them.
    const cleaned = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
    try {
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

module.exports = copyedit;
module.exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
module.exports._safeParseJson = _safeParseJson;
