// # Cover image task
//
// Generates a book cover via the configured image provider (usually
// OpenAI gpt-image-1). Builds the prompt from the book metadata + an
// optional style; KDP-friendly aspect ratio by default.
const {resolveProvider} = require('../router');

const KDP_SIZE = '1024x1536'; // 2:3, the standard KDP cover proportion
const SQUARE_SIZE = '1024x1024';

const STYLE_RECIPES = {
    'watercolor': 'soft watercolor washes, hand-painted texture, deckled edges',
    'classic-trade': 'classic trade-paperback design, restrained typography, single focal motif',
    'literary-noir': 'high contrast, single arresting image, restrained palette',
    'sci-fi-clean': 'minimalist sci-fi, sharp geometry, generous negative space',
    'romance-bright': 'soft palette, illustrated couple silhouette, romantic typography',
    'thriller-bold': 'dramatic typography, single ominous element, deep palette'
};

function _buildPrompt({book, style, extra}) {
    const styleHint = STYLE_RECIPES[style] || style || 'editorial book-cover design';

    const lines = [
        `Generate a book cover image for "${book.title}".`,
        book.subtitle ? `Subtitle: "${book.subtitle}".` : null,
        book.description ? `The book is about: ${book.description.slice(0, 400)}` : null,
        `Style: ${styleHint}.`,
        'Reserve clear space at the top for the title and at the bottom for the author byline.',
        'No text in the image — typography is added later in the editor.',
        extra || null
    ].filter(Boolean);

    return lines.join(' ');
}

/**
 * @param {Object} args
 * @param {Object} args.book - plain book row with title, subtitle, description
 * @param {string} [args.style] - style id from STYLE_RECIPES or a free-form hint
 * @param {string} [args.size='1024x1536'] - KDP-friendly default
 * @param {string} [args.extra] - extra instructions appended to the prompt
 * @param {string} [args.model]
 */
async function coverImage({book, style, size = KDP_SIZE, extra, model}) {
    if (!book || !book.title) {
        throw new Error('coverImage: book with a title is required');
    }

    const {provider} = resolveProvider('coverImage');
    if (!provider) {
        throw new Error('coverImage: no image-capable AI provider is configured');
    }

    const prompt = _buildPrompt({book, style, extra});
    const result = await provider.generateImage({prompt, size, style, model});

    return {
        provider: provider.name,
        model: result.model,
        prompt,
        url: result.url,
        b64: result.b64
    };
}

module.exports = coverImage;
module.exports.STYLE_RECIPES = STYLE_RECIPES;
module.exports.KDP_SIZE = KDP_SIZE;
module.exports.SQUARE_SIZE = SQUARE_SIZE;
module.exports._buildPrompt = _buildPrompt;
