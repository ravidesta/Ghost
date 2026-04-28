const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');

describe('Unit: Garamond models', function () {
    before(function () {
        models.init();
    });

    describe('Series', function () {
        it('is registered on the models index', function () {
            assert.ok(models.Series);
        });

        it('points at the series table', function () {
            assert.equal(models.Series.prototype.tableName, 'series');
        });

        it('defaults bundle_discount_pct to 30', function () {
            const series = new models.Series();
            assert.equal(series.defaults().bundle_discount_pct, 30);
        });

        it('exposes a books relation', function () {
            assert.equal(typeof models.Series.prototype.books, 'function');
        });
    });

    describe('Book', function () {
        it('is registered on the models index', function () {
            assert.ok(models.Book);
        });

        it('points at the books table', function () {
            assert.equal(models.Book.prototype.tableName, 'books');
        });

        it('defaults status to draft and font_pairing_id to the-sorbonne', function () {
            const book = new models.Book();
            const defaults = book.defaults();
            assert.equal(defaults.status, 'draft');
            assert.equal(defaults.font_pairing_id, 'the-sorbonne');
        });

        it('exposes author, series, and chapters relations', function () {
            assert.equal(typeof models.Book.prototype.author, 'function');
            assert.equal(typeof models.Book.prototype.series, 'function');
            assert.equal(typeof models.Book.prototype.chapters, 'function');
        });
    });

    describe('BookChapter', function () {
        it('is registered on the models index', function () {
            assert.ok(models.BookChapter);
        });

        it('points at the book_chapters table', function () {
            assert.equal(models.BookChapter.prototype.tableName, 'book_chapters');
        });

        it('defaults position to 0', function () {
            const chapter = new models.BookChapter();
            assert.equal(chapter.defaults().position, 0);
        });

        it('exposes a book relation', function () {
            assert.equal(typeof models.BookChapter.prototype.book, 'function');
        });
    });
});
