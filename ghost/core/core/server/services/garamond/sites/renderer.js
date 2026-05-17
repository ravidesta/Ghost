// # Static site renderer
//
// Pure: given a viewmodel and a page name, returns an HTML string. No
// file I/O, no storage, no network — easy to unit-test.
const handlebars = require('handlebars');

const templates = require('./templates');
const {getPairing} = require('../font-pairings');

const HELPERS_REGISTERED = (() => {
    handlebars.registerHelper('urlencodeFont', (name) => {
        return encodeURIComponent(name).replace(/%20/g, '+');
    });
    handlebars.registerHelper('formatPrice', (cents, currency) => {
        if (!cents) {
            return '';
        }
        const amount = (cents / 100).toFixed(2);
        const code = (currency || 'USD').toUpperCase();
        // Quick + dumb currency symbols; covers the common cases.
        const symbol = ({USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$'})[code] || '';
        return symbol ? `${symbol}${amount}` : `${amount} ${code}`;
    });
    return true;
})();

const COMPILED = {
    layout: handlebars.compile(templates.LAYOUT, {noEscape: false}),
    authorHome: handlebars.compile(templates.AUTHOR_HOME),
    bookPage: handlebars.compile(templates.BOOK_PAGE),
    seriesPage: handlebars.compile(templates.SERIES_PAGE),
    booksIndex: handlebars.compile(templates.BOOKS_INDEX),
    seriesIndex: handlebars.compile(templates.SERIES_INDEX)
};

function _resolvePairing(pairingId) {
    const pairing = getPairing(pairingId) || getPairing('the-sorbonne');
    return {
        headingFont: pairing.headingFont,
        bodyFont: pairing.bodyFont
    };
}

function _wrap({author, body, title, description, ogImage, fontPairingId, hasSeries}) {
    const fonts = _resolvePairing(fontPairingId);
    return COMPILED.layout({
        author,
        body,
        title,
        description,
        ogImage,
        hasSeries: Boolean(hasSeries),
        ...fonts
    });
}

function renderAuthorHome({author, books, series, fontPairingId}) {
    const body = COMPILED.authorHome({author, books, series});
    return _wrap({
        author,
        body,
        title: author.name,
        description: author.bio,
        ogImage: (books[0] && books[0].cover_image) || null,
        fontPairingId,
        hasSeries: series && series.length > 0
    });
}

function renderBooksIndex({author, books, fontPairingId, hasSeries}) {
    const body = COMPILED.booksIndex({books});
    return _wrap({
        author,
        body,
        title: `Books — ${author.name}`,
        fontPairingId,
        hasSeries
    });
}

function renderSeriesIndex({author, series, fontPairingId}) {
    const body = COMPILED.seriesIndex({series});
    return _wrap({
        author,
        body,
        title: `Series — ${author.name}`,
        fontPairingId,
        hasSeries: true
    });
}

function renderBookPage({author, book, series, checkoutUrl, readUrl, fontPairingId, hasSeries}) {
    const body = COMPILED.bookPage({book, series, checkoutUrl, readUrl});
    return _wrap({
        author,
        body,
        title: `${book.title} — ${author.name}`,
        description: book.description || book.subtitle,
        ogImage: book.cover_image,
        fontPairingId,
        hasSeries
    });
}

function renderSeriesPage({author, series, books, fontPairingId}) {
    const body = COMPILED.seriesPage({
        series,
        books,
        seriesCurrency: (books[0] && books[0].currency) || 'usd'
    });
    return _wrap({
        author,
        body,
        title: `${series.name} — ${author.name}`,
        description: series.description,
        fontPairingId,
        hasSeries: true
    });
}

module.exports = {
    renderAuthorHome,
    renderBooksIndex,
    renderSeriesIndex,
    renderBookPage,
    renderSeriesPage,
    _resolvePairing,
    HELPERS_REGISTERED
};
