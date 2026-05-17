// # .garamond packager
//
// Builds the downloadable bundle a customer gets after they purchase a book.
// The format is intentionally simple for the first slice: a single JSON
// document with a manifest and the chapter content. A future revision will
// swap to a real zip with media assets — the producer/consumer boundary is
// already correct.
//
// The packager is I/O-pure: it accepts plain book + chapters objects, so the
// caller decides where the rows come from (DB, fixture, test).
const GARAMOND_FORMAT_VERSION = 1;

/**
 * Build a .garamond bundle for a book.
 *
 * @param {Object} args
 * @param {Object} args.book - plain book attributes
 * @param {Array}  args.chapters - chapters in display order: [{title, content, position}]
 * @param {string} [args.purchaserMemberId] - watermarks the bundle to the buyer
 * @returns {{filename: string, mimeType: string, body: string}}
 */
function buildBundle({book, chapters, purchaserMemberId = null}) {
    if (!book || !book.id || !book.title) {
        throw new Error('book with id and title is required');
    }
    if (!Array.isArray(chapters)) {
        throw new Error('chapters must be an array');
    }

    const ordered = [...chapters]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((c, idx) => ({
            position: idx,
            title: c.title ?? null,
            content: c.content ?? ''
        }));

    const bundle = {
        format: 'garamond',
        formatVersion: GARAMOND_FORMAT_VERSION,
        generatedAt: new Date().toISOString(),
        watermark: purchaserMemberId,
        book: {
            id: book.id,
            title: book.title,
            subtitle: book.subtitle ?? null,
            author_id: book.author_id ?? null,
            series_id: book.series_id ?? null,
            series_position: book.series_position ?? null,
            description: book.description ?? null,
            cover_image: book.cover_image ?? null,
            font_pairing_id: book.font_pairing_id ?? 'the-sorbonne',
            format_settings: book.format_settings ?? null
        },
        chapters: ordered
    };

    const filename = `${slugify(book.title)}-${book.id}.garamond`;
    return {
        filename,
        mimeType: 'application/vnd.garamond+json',
        body: JSON.stringify(bundle, null, 2)
    };
}

function slugify(title) {
    return String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'book';
}

module.exports = {
    GARAMOND_FORMAT_VERSION,
    buildBundle
};
