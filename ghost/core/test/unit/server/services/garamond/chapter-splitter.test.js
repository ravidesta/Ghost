const assert = require('node:assert/strict');

const {
    splitHtmlByHeadings,
    splitTextByChapters,
    stripTags,
    deriveTitle
} = require('../../../../../core/server/services/garamond/importer/chapter-splitter');

describe('Garamond: chapter splitter', function () {
    describe('splitHtmlByHeadings', function () {
        it('splits at h1/h2/h3 and keeps the inner HTML of each chapter', function () {
            const html = '<h1>Chapter One</h1><p>First paragraph.</p><h1>Chapter Two</h1><p>Second.</p>';
            const chapters = splitHtmlByHeadings(html);
            assert.equal(chapters.length, 2);
            assert.equal(chapters[0].title, 'Chapter One');
            assert.equal(chapters[0].content, '<p>First paragraph.</p>');
            assert.equal(chapters[1].title, 'Chapter Two');
            assert.equal(chapters[1].content, '<p>Second.</p>');
        });

        it('puts prologue content (before the first heading) in an untitled chapter', function () {
            const html = '<p>Front matter.</p><h1>Chapter One</h1><p>Body.</p>';
            const chapters = splitHtmlByHeadings(html);
            assert.equal(chapters.length, 2);
            assert.equal(chapters[0].title, null);
            assert.equal(chapters[0].content, '<p>Front matter.</p>');
            assert.equal(chapters[1].title, 'Chapter One');
        });

        it('splits on h2 and h3 too', function () {
            const html = '<h2>Part Two</h2><p>x</p><h3>Section</h3><p>y</p>';
            const chapters = splitHtmlByHeadings(html);
            assert.equal(chapters.length, 2);
            assert.equal(chapters[0].title, 'Part Two');
            assert.equal(chapters[1].title, 'Section');
        });

        it('treats HTML with no headings as a single untitled chapter', function () {
            const chapters = splitHtmlByHeadings('<p>Just one paragraph.</p>');
            assert.equal(chapters.length, 1);
            assert.equal(chapters[0].title, null);
            assert.equal(chapters[0].content, '<p>Just one paragraph.</p>');
        });

        it('strips inline tags from heading titles', function () {
            const html = '<h1><em>Chapter</em> One</h1><p>x</p>';
            const chapters = splitHtmlByHeadings(html);
            assert.equal(chapters[0].title, 'Chapter One');
        });

        it('handles empty input gracefully', function () {
            const chapters = splitHtmlByHeadings('');
            assert.equal(chapters.length, 1);
            assert.equal(chapters[0].content, '');
        });
    });

    describe('splitTextByChapters', function () {
        it('splits on "Chapter N:" markers', function () {
            const text = 'Chapter 1: One\nA paragraph.\n\nChapter 2: Two\nAnother.';
            const chapters = splitTextByChapters(text);
            assert.equal(chapters.length, 2);
            assert.equal(chapters[0].title, 'One');
            assert.equal(chapters[1].title, 'Two');
        });

        it('handles Roman numerals', function () {
            const text = 'Chapter IV\nFour.\n\nChapter V\nFive.';
            const chapters = splitTextByChapters(text);
            assert.equal(chapters.length, 2);
        });

        it('treats heading-less text as one untitled chapter', function () {
            const chapters = splitTextByChapters('Just a blob with no markers.');
            assert.equal(chapters.length, 1);
            assert.equal(chapters[0].title, null);
        });
    });

    describe('stripTags', function () {
        it('removes tags and decodes nbsp', function () {
            assert.equal(stripTags('<p><strong>Hi</strong>&nbsp;there</p>'), 'Hi there');
        });
    });

    describe('deriveTitle', function () {
        it('returns the first chapter title when one exists', function () {
            const chapters = [{title: 'Real Title', content: ''}];
            assert.equal(deriveTitle(chapters, '/tmp/whatever.txt'), 'Real Title');
        });

        it('falls back to a cleaned filename', function () {
            const chapters = [{title: null, content: ''}];
            assert.equal(deriveTitle(chapters, '/tmp/the_lighthouse-keeper.epub'), 'the lighthouse keeper');
        });
    });
});
