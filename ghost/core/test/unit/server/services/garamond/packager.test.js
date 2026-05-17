const assert = require('node:assert/strict');

const {buildBundle, GARAMOND_FORMAT_VERSION} = require('../../../../../core/server/services/garamond/packager');

describe('Garamond: packager', function () {
    const book = {
        id: '0123456789abcdef01234567',
        title: 'The Lighthouse Keeper',
        subtitle: 'A Quiet Story',
        author_id: 'author-1',
        series_id: 'series-1',
        series_position: 1,
        description: 'A man and a lamp.',
        cover_image: '/content/images/cover.png',
        font_pairing_id: 'the-sorbonne',
        format_settings: null
    };

    const chapters = [
        {position: 1, title: 'Chapter Two', content: 'And then it was morning.'},
        {position: 0, title: 'Chapter One', content: 'It was dark.'}
    ];

    it('returns a JSON body with the manifest and ordered chapters', function () {
        const bundle = buildBundle({book, chapters});
        const parsed = JSON.parse(bundle.body);

        assert.equal(parsed.format, 'garamond');
        assert.equal(parsed.formatVersion, GARAMOND_FORMAT_VERSION);
        assert.equal(parsed.book.id, book.id);
        assert.equal(parsed.book.title, book.title);
        assert.equal(parsed.chapters.length, 2);
        assert.equal(parsed.chapters[0].title, 'Chapter One', 'chapters must be sorted by position');
        assert.equal(parsed.chapters[1].title, 'Chapter Two');
    });

    it('reassigns sequential positions starting at 0', function () {
        const bundle = buildBundle({book, chapters: [
            {position: 7, title: 'A', content: ''},
            {position: 3, title: 'B', content: ''}
        ]});
        const parsed = JSON.parse(bundle.body);
        assert.equal(parsed.chapters[0].position, 0);
        assert.equal(parsed.chapters[1].position, 1);
    });

    it('produces a slugged filename ending in .garamond', function () {
        const {filename} = buildBundle({book, chapters: []});
        assert.match(filename, /^the-lighthouse-keeper-0123456789abcdef01234567\.garamond$/);
    });

    it('falls back to "book" when the title has no usable characters', function () {
        const {filename} = buildBundle({
            book: {...book, title: '!!!'},
            chapters: []
        });
        assert.match(filename, /^book-/);
    });

    it('uses application/vnd.garamond+json as the MIME type', function () {
        const {mimeType} = buildBundle({book, chapters: []});
        assert.equal(mimeType, 'application/vnd.garamond+json');
    });

    it('watermarks with the buyer when supplied', function () {
        const bundle = buildBundle({book, chapters: [], purchaserMemberId: 'member-123'});
        const parsed = JSON.parse(bundle.body);
        assert.equal(parsed.watermark, 'member-123');
    });

    it('rejects when required book fields are missing', function () {
        assert.throws(() => buildBundle({book: {title: 'x'}, chapters: []}), /id and title/);
        assert.throws(() => buildBundle({book: {id: 'x'}, chapters: []}), /id and title/);
    });

    it('rejects when chapters is not an array', function () {
        assert.throws(() => buildBundle({book, chapters: 'nope'}), /array/);
    });

    it('handles a chapter with null/undefined fields without crashing', function () {
        const bundle = buildBundle({book, chapters: [{title: null, content: undefined}]});
        const parsed = JSON.parse(bundle.body);
        assert.equal(parsed.chapters[0].title, null);
        assert.equal(parsed.chapters[0].content, '');
    });
});
