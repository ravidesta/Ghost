const assert = require('node:assert/strict');

const coursify = require('../../../../../core/server/services/garamond/ai/tasks/coursify-book');

const book = {
    id: 'b1',
    title: 'The Lighthouse Keeper',
    subtitle: 'A Quiet Story',
    description: 'A man and a lamp.'
};

const chapters = [
    {position: 0, title: 'Chapter One', content: 'It was a dark and stormy night.'},
    {position: 1, title: 'Chapter Two', content: 'Then it was morning.'},
    {position: 2, title: 'Chapter Three', content: 'The lamp was warm.'}
];

describe('Garamond AI: coursifyBook', function () {
    describe('arg validation', function () {
        it('requires a book with a title', async function () {
            await assert.rejects(() => coursify({chapters}), /book with a title/);
            await assert.rejects(() => coursify({book: {}, chapters}), /book with a title/);
        });

        it('requires at least one chapter', async function () {
            await assert.rejects(() => coursify({book, chapters: []}), /at least one chapter/);
            await assert.rejects(() => coursify({book}), /at least one chapter/);
        });
    });

    describe('chapter summarisation', function () {
        it('keeps chapters short and clamps content length', function () {
            const long = 'x'.repeat(20000);
            const summary = coursify._summariseChapter({position: 0, title: 'A', content: long}, 100);
            assert.equal(summary.excerpt.length, 100);
        });

        it('falls back to a numbered title when title is missing', function () {
            const summary = coursify._summariseChapter({position: 2, content: 'hi'});
            assert.equal(summary.title, 'Chapter 3');
        });
    });

    describe('user prompt assembly', function () {
        it('includes book title and every chapter in position order', function () {
            const prompt = coursify._buildUserPrompt({book, chapters: [...chapters].reverse()});
            assert.match(prompt, /Book title: The Lighthouse Keeper/);
            const chapter1Pos = prompt.indexOf('Chapter One');
            const chapter2Pos = prompt.indexOf('Chapter Two');
            const chapter3Pos = prompt.indexOf('Chapter Three');
            assert.ok(chapter1Pos < chapter2Pos && chapter2Pos < chapter3Pos, 'chapters should appear in position order');
        });

        it('includes description and subtitle when present', function () {
            const prompt = coursify._buildUserPrompt({book, chapters});
            assert.match(prompt, /Subtitle: A Quiet Story/);
            assert.match(prompt, /Description: A man and a lamp/);
        });

        it('omits subtitle and description when absent', function () {
            const prompt = coursify._buildUserPrompt({
                book: {id: 'b2', title: 'Bare'},
                chapters: [{position: 0, content: 'x'}]
            });
            assert.doesNotMatch(prompt, /Subtitle:/);
            assert.doesNotMatch(prompt, /Description:/);
        });
    });

    describe('JSON parser', function () {
        it('parses clean JSON', function () {
            assert.deepEqual(
                coursify._safeParseJson('{"title":"x","modules":[]}'),
                {title: 'x', modules: []}
            );
        });

        it('strips ```json fences', function () {
            assert.deepEqual(
                coursify._safeParseJson('```json\n{"a":1}\n```'),
                {a: 1}
            );
        });

        it('returns null on garbage', function () {
            assert.equal(coursify._safeParseJson('not json'), null);
            assert.equal(coursify._safeParseJson(''), null);
            assert.equal(coursify._safeParseJson(null), null);
        });
    });

    describe('system prompt', function () {
        it('names every lesson kind so the model knows what to emit', function () {
            assert.match(coursify.SYSTEM_PROMPT, /reading/);
            assert.match(coursify.SYSTEM_PROMPT, /exercise/);
            assert.match(coursify.SYSTEM_PROMPT, /quiz/);
            assert.match(coursify.SYSTEM_PROMPT, /discussion/);
        });

        it('demands JSON-only output (no commentary, no fences)', function () {
            assert.match(coursify.SYSTEM_PROMPT, /JSON/);
            assert.match(coursify.SYSTEM_PROMPT, /no commentary/i);
        });
    });
});
