const assert = require('node:assert/strict');

const renderer = require('../../../../../core/server/services/garamond/sites/renderer');

const author = {id: 'a1', name: 'Jane Lighthouse', bio: 'Writes quiet stories.', slug: 'jane-lighthouse'};

const books = [
    {
        id: 'b1', slug: 'the-keeper', title: 'The Keeper', subtitle: 'A Quiet Story',
        description: 'A man and a lamp.',
        cover_image: 'https://cdn.example/cover-1.png',
        price_cents: 599, currency: 'usd',
        series_id: 's1', series_position: 1,
        status: 'published'
    },
    {
        id: 'b2', slug: 'the-fog', title: 'The Fog',
        cover_image: null,
        price_cents: 999, currency: 'usd',
        status: 'published'
    }
];

const series = [
    {id: 's1', slug: 'lighthouse-cycle', name: 'The Lighthouse Cycle', description: 'A trilogy.', cover_image: null}
];

describe('Garamond sites: renderer', function () {
    it('compiles the home page with the author name and book titles', function () {
        const html = renderer.renderAuthorHome({author, books, series, fontPairingId: 'the-sorbonne'});
        assert.match(html, /Jane Lighthouse/);
        assert.match(html, /The Keeper/);
        assert.match(html, /The Fog/);
        assert.match(html, /The Lighthouse Cycle/);
        // Layout chrome
        assert.match(html, /<!doctype html>/);
        assert.match(html, /class="author-name"/);
    });

    it('loads the configured font pairing in the Google Fonts URL', function () {
        const html = renderer.renderAuthorHome({author, books, series, fontPairingId: 'the-sorbonne'});
        assert.match(html, /family=EB\+Garamond/);
        assert.match(html, /family=Lato/);
    });

    it('falls back to the house pairing when an unknown id is given', function () {
        const html = renderer.renderAuthorHome({author, books, series, fontPairingId: 'no-such-pairing'});
        // Sorbonne is EB Garamond + Lato
        assert.match(html, /family=EB\+Garamond/);
    });

    it('renders a book page with formatted price and a buy CTA', function () {
        const html = renderer.renderBookPage({
            author,
            book: books[0],
            series: series[0],
            checkoutUrl: '/garamond/books/b1/checkout',
            readUrl: '/garamond/books/b1/download',
            fontPairingId: 'the-sorbonne',
            hasSeries: true
        });
        assert.match(html, /The Keeper/);
        assert.match(html, /\$5\.99/);
        assert.match(html, /class="buy"/);
        assert.match(html, /href="\/garamond\/books\/b1\/checkout"/);
        // series chrome
        assert.match(html, /Book 1/);
    });

    it('renders a free book with a Read CTA instead of Buy', function () {
        const free = {...books[0], price_cents: null};
        const html = renderer.renderBookPage({
            author, book: free, series: null,
            checkoutUrl: '/x', readUrl: '/garamond/books/b1/download',
            fontPairingId: 'the-sorbonne', hasSeries: false
        });
        assert.match(html, />Read</);
        assert.doesNotMatch(html, />Buy now</);
    });

    it('renders a series page with books in series order', function () {
        const html = renderer.renderSeriesPage({
            author,
            series: series[0],
            books: [books[0]],
            fontPairingId: 'the-sorbonne'
        });
        assert.match(html, /The Lighthouse Cycle/);
        assert.match(html, /Book 1/);
        assert.match(html, /The Keeper/);
    });

    it('hides the Series nav link when the author has no series', function () {
        const html = renderer.renderAuthorHome({author, books, series: [], fontPairingId: 'the-sorbonne'});
        assert.doesNotMatch(html, /href="\/series\/"/);
    });

    it('escapes user-supplied content by default', function () {
        const evilBooks = [{...books[0], title: '<script>alert(1)</script>'}];
        const html = renderer.renderAuthorHome({author, books: evilBooks, series: [], fontPairingId: 'the-sorbonne'});
        assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
        assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    });
});
