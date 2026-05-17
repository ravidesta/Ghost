// # Garamond sites
//
// Orchestrator: pulls a single author's published books + series out of
// the model layer, renders the static pages, and uploads them via the
// publisher. Designed to be safe to call repeatedly — generated paths
// are deterministic, so each call overwrites the previous output.
const renderer = require('./renderer');
const publisher = require('./publisher');

let _models;
function models() {
    if (!_models) {
        _models = require('../../../models');
    }
    return _models;
}

function _slugify(value, fallback) {
    return String(value || fallback || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || fallback;
}

function _siteUrl(req) {
    // The admin endpoint owns this; here we just produce a relative URL
    // so the static page works regardless of where it's served from.
    return req || '';
}

/**
 * Render and publish a complete author site (home + book pages + series pages).
 *
 * @param {Object} args
 * @param {string} args.authorId
 * @param {string} [args.fontPairingId='the-sorbonne']
 * @returns {Promise<{homepageUrl: string, paths: string[], counts: Object}>}
 */
async function publishAuthor({authorId, fontPairingId = 'the-sorbonne'}) {
    if (!authorId) {
        throw new Error('publishAuthor: authorId is required');
    }

    const {Book, Series, User} = models();

    const userModel = await User.findOne({id: authorId}, {require: false});
    if (!userModel) {
        throw new Error(`publishAuthor: author ${authorId} not found`);
    }
    const author = {
        id: userModel.get('id'),
        name: userModel.get('name'),
        email: userModel.get('email'),
        bio: userModel.get('bio') || userModel.get('description') || '',
        slug: userModel.get('slug') || _slugify(userModel.get('name'), userModel.get('id'))
    };

    const booksCollection = await Book.findAll({
        filter: `author_id:${authorId}+status:published`,
        order: 'published_at desc'
    });
    const books = booksCollection.models.map(m => m.toJSON());

    const seriesIds = [...new Set(books.map(b => b.series_id).filter(Boolean))];
    const seriesById = {};
    if (seriesIds.length > 0) {
        const seriesFilter = seriesIds.map(id => `id:${id}`).join(',');
        const seriesCollection = await Series.findAll({filter: seriesFilter});
        for (const s of seriesCollection.models) {
            seriesById[s.get('id')] = s.toJSON();
        }
    }
    const series = Object.values(seriesById);

    const hasSeries = series.length > 0;
    const pages = {};

    pages['index.html'] = renderer.renderAuthorHome({
        author,
        books,
        series,
        fontPairingId
    });

    pages['books/index.html'] = renderer.renderBooksIndex({
        author,
        books,
        fontPairingId,
        hasSeries
    });

    if (hasSeries) {
        pages['series/index.html'] = renderer.renderSeriesIndex({
            author,
            series,
            fontPairingId
        });
    }

    for (const book of books) {
        const slug = book.slug || _slugify(book.title, book.id);
        const seriesForBook = book.series_id ? seriesById[book.series_id] : null;
        pages[`books/${slug}/index.html`] = renderer.renderBookPage({
            author,
            book,
            series: seriesForBook,
            checkoutUrl: `/garamond/books/${book.id}/checkout`,
            readUrl: `/garamond/books/${book.id}/download`,
            fontPairingId,
            hasSeries
        });
    }

    for (const s of series) {
        const slug = s.slug || _slugify(s.name, s.id);
        const booksInSeries = books
            .filter(b => b.series_id === s.id)
            .sort((a, b) => (a.series_position ?? 0) - (b.series_position ?? 0));
        pages[`series/${slug}/index.html`] = renderer.renderSeriesPage({
            author,
            series: s,
            books: booksInSeries,
            fontPairingId
        });
    }

    const result = await publisher.publish({authorSlug: author.slug, pages});
    return {
        ...result,
        counts: {
            books: books.length,
            series: series.length,
            pages: Object.keys(pages).length
        }
    };
}

module.exports = {
    publishAuthor,
    renderer,
    publisher,
    _slugify
};
