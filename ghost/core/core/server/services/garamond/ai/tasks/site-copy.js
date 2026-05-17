// # Site copy task
//
// Generates the prose that fills the static author site — bio,
// tagline, and an "about" paragraph — from a short seed. Routes
// through the multilingual defaults (Mistral first) so non-English
// authors get native-quality copy without code changes.
const {resolveProvider} = require('../router');

const SUPPORTED_LANGUAGES = [
    'en', 'fr', 'de', 'es', 'it', 'pt', 'nl',
    'pl', 'sv', 'da', 'no', 'fi', 'cs',
    'ja', 'ko', 'zh', 'ar'
];

function _systemPrompt(language) {
    const langName = LANGUAGE_NAMES[language] || language;
    return [
        `You write site copy for authors who publish on the Garamond platform.`,
        `All output MUST be in ${langName}.`,
        'Voice: warm, restrained, literary. Avoid hype words ("amazing", "incredible").',
        'Return a single JSON object with these keys, all strings:',
        '  "tagline"      — 6-12 words.',
        '  "bio"          — 1-3 sentences, third person.',
        '  "aboutLong"    — 2-4 short paragraphs, third person.',
        '  "bookBlurb"    — only present if a book seed was provided; 2-3 sentences in first person voice of the book, no spoilers.',
        'Output only the JSON. No code fences, no commentary.'
    ].join('\n');
}

const LANGUAGE_NAMES = {
    en: 'English', fr: 'French', de: 'German', es: 'Spanish',
    it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish',
    sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish',
    cs: 'Czech', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic'
};

function _userPrompt({authorName, seed, bookSeed}) {
    const parts = [
        `Author name: ${authorName}`,
        `Author seed:\n${seed}`
    ];
    if (bookSeed) {
        parts.push(`Book seed:\n${bookSeed}`);
    }
    return parts.join('\n\n');
}

/**
 * Generate site copy for an author.
 *
 * @param {Object} args
 * @param {string} args.authorName
 * @param {string} args.seed      a sentence or paragraph the author wrote
 * @param {string} [args.bookSeed] optional seed for a specific book blurb
 * @param {string} [args.language='en']  ISO-639-1 code
 * @param {string} [args.model]
 */
async function siteCopy({authorName, seed, bookSeed, language = 'en', model}) {
    if (!authorName || !seed) {
        throw new Error('siteCopy: authorName and seed are required');
    }
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error(`siteCopy: unsupported language "${language}"`);
    }

    const {provider} = resolveProvider('siteCopy');
    if (!provider) {
        throw new Error('siteCopy: no AI provider is configured');
    }

    const result = await provider.generateText({
        system: _systemPrompt(language),
        prompt: _userPrompt({authorName, seed, bookSeed}),
        maxTokens: 1200,
        model
    });

    return {
        provider: provider.name,
        model: result.model,
        language,
        copy: _safeParseJson(result.text)
    };
}

function _safeParseJson(raw) {
    if (!raw) {
        return null;
    }
    const cleaned = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}

module.exports = siteCopy;
module.exports.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
module.exports.LANGUAGE_NAMES = LANGUAGE_NAMES;
module.exports._systemPrompt = _systemPrompt;
module.exports._userPrompt = _userPrompt;
module.exports._safeParseJson = _safeParseJson;
