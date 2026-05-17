const assert = require('node:assert/strict');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const {
    SUPPORTED_EXTENSIONS,
    isSupported,
    walkBookFiles,
    parseBookFile,
    importFolder
} = require('../../../../../core/server/services/garamond/importer');

describe('Garamond: importer', function () {
    let tmpDir;

    beforeEach(async function () {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garamond-importer-'));
    });

    afterEach(async function () {
        if (tmpDir) {
            await fs.remove(tmpDir);
        }
    });

    describe('isSupported / SUPPORTED_EXTENSIONS', function () {
        it('claims every advertised extension', function () {
            for (const ext of SUPPORTED_EXTENSIONS) {
                assert.equal(isSupported(`book${ext}`), true, `expected ${ext} to be supported`);
            }
        });

        it('rejects anything else', function () {
            assert.equal(isSupported('cover.png'), false);
            assert.equal(isSupported('notes.rtf'), false);
        });

        it('is case-insensitive', function () {
            assert.equal(isSupported('Manuscript.EPUB'), true);
        });
    });

    describe('walkBookFiles', function () {
        it('yields supported files recursively and skips dotfiles', async function () {
            await fs.writeFile(path.join(tmpDir, 'one.txt'), '# Hello');
            await fs.mkdir(path.join(tmpDir, 'nested'));
            await fs.writeFile(path.join(tmpDir, 'nested', 'two.md'), '# Two');
            await fs.writeFile(path.join(tmpDir, 'cover.png'), 'not a book');
            await fs.writeFile(path.join(tmpDir, '.hidden.txt'), 'noise');

            const found = [];
            for await (const file of walkBookFiles(tmpDir)) {
                found.push(path.basename(file));
            }
            found.sort();

            assert.deepEqual(found, ['one.txt', 'two.md']);
        });
    });

    describe('parseBookFile (text)', function () {
        it('splits a markdown file on h1/h2/h3 headings', async function () {
            const file = path.join(tmpDir, 'lighthouse.md');
            await fs.writeFile(file, [
                '# Chapter One',
                'It was a dark and stormy night.',
                '',
                '## A Smaller Heading',
                'More text here.',
                '',
                '# Chapter Two',
                'And then it was morning.'
            ].join('\n'));

            const result = await parseBookFile(file);

            assert.equal(result.format, 'md');
            assert.equal(result.filename, 'lighthouse.md');
            assert.equal(result.title, 'Chapter One'); // first heading wins
            assert.equal(result.chapters.length, 3);
            assert.equal(result.chapters[0].title, 'Chapter One');
            assert.equal(result.chapters[1].title, 'A Smaller Heading');
            assert.equal(result.chapters[2].title, 'Chapter Two');
            assert.match(result.chapters[2].content, /morning/);
        });

        it('splits a plain text file on "Chapter N" markers', async function () {
            const file = path.join(tmpDir, 'plain.txt');
            await fs.writeFile(file, [
                'Chapter 1: The Beginning',
                'A first paragraph.',
                '',
                'Chapter 2: The Middle',
                'A second paragraph.'
            ].join('\n'));

            const result = await parseBookFile(file);

            assert.equal(result.chapters.length, 2);
            assert.equal(result.chapters[0].title, 'The Beginning');
            assert.equal(result.chapters[1].title, 'The Middle');
        });

        it('treats a heading-less file as a single untitled chapter', async function () {
            const file = path.join(tmpDir, 'untitled-novella.txt');
            await fs.writeFile(file, 'Just one big slab of prose with no chapter breaks.');

            const result = await parseBookFile(file);

            assert.equal(result.chapters.length, 1);
            assert.equal(result.chapters[0].title, null);
            assert.equal(result.title, 'untitled novella');
        });
    });

    describe('parseBookFile (unimplemented formats)', function () {
        it('throws a clear error for EPUB', async function () {
            const file = path.join(tmpDir, 'novel.epub');
            await fs.writeFile(file, 'PKfake');
            await assert.rejects(() => parseBookFile(file), /EPUB parsing is not implemented/);
        });

        it('throws a clear error for PDF', async function () {
            const file = path.join(tmpDir, 'novel.pdf');
            await fs.writeFile(file, '%PDF-1.4 fake');
            await assert.rejects(() => parseBookFile(file), /PDF parsing is not implemented/);
        });

        it('throws a clear error for DOCX', async function () {
            const file = path.join(tmpDir, 'novel.docx');
            await fs.writeFile(file, 'PKfake');
            await assert.rejects(() => parseBookFile(file), /DOCX parsing is not implemented/);
        });

        it('throws a clear error for Pages', async function () {
            const file = path.join(tmpDir, 'novel.pages');
            await fs.writeFile(file, 'PKfake');
            await assert.rejects(() => parseBookFile(file), /Pages parsing is not implemented/);
        });
    });

    describe('importFolder', function () {
        it('returns one record per supported file and collects per-file errors', async function () {
            await fs.writeFile(path.join(tmpDir, 'good.txt'), '# Title\nContents.');
            await fs.writeFile(path.join(tmpDir, 'broken.epub'), 'PKfake');
            await fs.writeFile(path.join(tmpDir, 'unrelated.png'), 'ignored');

            const {books, errors} = await importFolder(tmpDir);

            assert.equal(books.length, 1);
            assert.equal(books[0].filename, 'good.txt');
            assert.equal(books[0].title, 'Title');

            assert.equal(errors.length, 1);
            assert.equal(path.basename(errors[0].file), 'broken.epub');
            assert.match(errors[0].error, /EPUB parsing is not implemented/);
        });

        it('rejects when given a path that is not a directory', async function () {
            const file = path.join(tmpDir, 'not-a-dir.txt');
            await fs.writeFile(file, 'x');
            await assert.rejects(() => importFolder(file), /Not a directory/);
        });
    });
});
