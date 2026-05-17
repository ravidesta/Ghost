const assert = require('node:assert/strict');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyISODateTime, anyLocationFor} = matchers;

const matchBook = {
    id: anyObjectId,
    author_id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const matchSeries = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Garamond Admin API', function () {
    let agent;
    let createdBookId;
    let createdSeriesId;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    describe('Series', function () {
        it('Can add', async function () {
            const series = {
                name: 'The Lighthouse Cycle',
                slug: 'lighthouse-cycle',
                description: 'A trilogy of quiet stories.'
            };

            const {body} = await agent
                .post('series/')
                .body({series: [series]})
                .expectStatus(201)
                .matchBodySnapshot({series: [matchSeries]})
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('series')
                });

            createdSeriesId = body.series[0].id;
            assert.equal(body.series[0].bundle_discount_pct, 30);
        });

        it('Can browse', async function () {
            await agent
                .get('series/')
                .expectStatus(200)
                .matchHeaderSnapshot({'content-version': anyContentVersion, etag: anyEtag});
        });

        it('Can read with books eager-loaded', async function () {
            const {body} = await agent
                .get(`series/${createdSeriesId}/`)
                .expectStatus(200);
            assert.equal(body.series[0].id, createdSeriesId);
        });

        it('Can edit', async function () {
            await agent
                .put(`series/${createdSeriesId}/`)
                .body({series: [{name: 'The Lighthouse Cycle (Revised)'}]})
                .expectStatus(200);
        });
    });

    describe('Books', function () {
        it('Can add', async function () {
            const book = {
                title: 'The Lighthouse Keeper',
                slug: 'lighthouse-keeper',
                series_id: createdSeriesId,
                series_position: 1,
                font_pairing_id: 'the-sorbonne'
            };

            const {body} = await agent
                .post('books/')
                .body({books: [book]})
                .expectStatus(201)
                .matchBodySnapshot({books: [matchBook]})
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    location: anyLocationFor('books')
                });

            createdBookId = body.books[0].id;
            assert.equal(body.books[0].status, 'draft');
            assert.equal(body.books[0].font_pairing_id, 'the-sorbonne');
        });

        it('Can browse', async function () {
            await agent
                .get('books/')
                .expectStatus(200)
                .matchHeaderSnapshot({'content-version': anyContentVersion, etag: anyEtag});
        });

        it('Can read with chapters and series eager-loaded', async function () {
            const {body} = await agent
                .get(`books/${createdBookId}/`)
                .expectStatus(200);
            assert.equal(body.books[0].id, createdBookId);
            assert.ok(Array.isArray(body.books[0].chapters));
        });

        it('Can edit', async function () {
            await agent
                .put(`books/${createdBookId}/`)
                .body({books: [{subtitle: 'A Quiet Story', price_cents: 599}]})
                .expectStatus(200);
        });

        it('Can import a parsed book payload', async function () {
            const payload = {
                title: 'Imported Novel',
                slug: 'imported-novel',
                chapters: [
                    {title: 'Chapter One', content: 'It was a dark and stormy night.'},
                    {title: 'Chapter Two', content: 'Then it was morning.'}
                ]
            };

            const {body} = await agent
                .post('books/import/')
                .body({books: [payload]})
                .expectStatus(201);

            assert.equal(body.books[0].title, 'Imported Novel');
            assert.equal(body.books[0].chapters.length, 2);
            assert.equal(body.books[0].chapters[0].position, 0);
        });

        it('Rejects an import with no chapters array', async function () {
            await agent
                .post('books/import/')
                .body({books: [{title: 'No Chapters'}]})
                .expectStatus(400);
        });

        it('Can download the .garamond bundle', async function () {
            const res = await agent
                .get(`books/${createdBookId}/download/`)
                .expectStatus(200);

            const parsed = JSON.parse(res.text || res.body);
            assert.equal(parsed.format, 'garamond');
            assert.equal(parsed.book.id, createdBookId);
        });

        it('Can check access', async function () {
            const {body} = await agent
                .get(`books/${createdBookId}/access/`)
                .expectStatus(200);
            assert.equal(typeof body.access, 'boolean');
        });

        it('Can delete', async function () {
            await agent
                .delete(`books/${createdBookId}/`)
                .expectStatus(204);
        });
    });

    describe('Book chapters', function () {
        let bookId;

        before(async function () {
            const {body} = await agent
                .post('books/')
                .body({books: [{title: 'Chapter Host', slug: 'chapter-host'}]})
                .expectStatus(201);
            bookId = body.books[0].id;
        });

        it('Can append a chapter (auto-positions at end)', async function () {
            const {body: first} = await agent
                .post(`books/${bookId}/chapters/`)
                .body({book_chapters: [{title: 'One', content: 'First.'}]})
                .expectStatus(201);
            assert.equal(first.book_chapters[0].position, 0);

            const {body: second} = await agent
                .post(`books/${bookId}/chapters/`)
                .body({book_chapters: [{title: 'Two', content: 'Second.'}]})
                .expectStatus(201);
            assert.equal(second.book_chapters[0].position, 1);
        });

        it('Can browse chapters in display order', async function () {
            const {body} = await agent
                .get(`books/${bookId}/chapters/`)
                .expectStatus(200);
            assert.equal(body.book_chapters.length, 2);
            assert.equal(body.book_chapters[0].position, 0);
            assert.equal(body.book_chapters[1].position, 1);
        });
    });
});
