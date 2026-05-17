// # Garamond importer
//
// Walks a folder and turns every recognised book file (.epub, .pdf, .docx,
// .txt, .md, .pages) into a structured intermediate record:
//
//   {
//     filename, format, title, chapters: [{title, content}]
//   }
//
// Persistence (creating Book + BookChapter rows) is the caller's job — this
// service stays I/O-pure so it's easy to test and easy to swap parsers in.
const fs = require('fs-extra');
const path = require('path');

const TextParser = require('./parsers/text-parser');
const EpubParser = require('./parsers/epub-parser');
const PdfParser = require('./parsers/pdf-parser');
const DocxParser = require('./parsers/docx-parser');
const RtfParser = require('./parsers/rtf-parser');
const PagesParser = require('./parsers/pages-parser');

const PARSERS = {
    '.txt': new TextParser(),
    '.md': new TextParser(),
    '.markdown': new TextParser(),
    '.epub': new EpubParser(),
    '.pdf': new PdfParser(),
    '.docx': new DocxParser(),
    '.rtf': new RtfParser(),
    '.pages': new PagesParser()
};

const SUPPORTED_EXTENSIONS = Object.keys(PARSERS);

function isSupported(filePath) {
    return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/**
 * Recursively walks a directory and yields every file that has a registered
 * parser. Skips hidden files and node_modules-like noise.
 *
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* walkBookFiles(dir) {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    for (const entry of entries) {
        if (entry.name.startsWith('.')) {
            continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walkBookFiles(full);
        } else if (entry.isFile() && isSupported(full)) {
            yield full;
        }
    }
}

/**
 * Parse a single book file using the appropriate parser.
 *
 * @param {string} filePath
 * @returns {Promise<{filename: string, format: string, title: string, chapters: Array}>}
 */
async function parseBookFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const parser = PARSERS[ext];
    if (!parser) {
        throw new Error(`No parser registered for extension: ${ext}`);
    }
    const parsed = await parser.parse(filePath);
    return {
        filename: path.basename(filePath),
        format: ext.slice(1),
        ...parsed
    };
}

/**
 * Walk a folder, parse every recognised file, and return one record per file.
 * Failures are isolated per file so a single bad PDF doesn't kill a 270-book
 * batch — they're collected into `errors`.
 *
 * @param {string} rootDir
 * @returns {Promise<{books: Array, errors: Array<{file: string, error: string}>}>}
 */
async function importFolder(rootDir) {
    const stat = await fs.stat(rootDir);
    if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${rootDir}`);
    }

    const books = [];
    const errors = [];

    for await (const file of walkBookFiles(rootDir)) {
        try {
            books.push(await parseBookFile(file));
        } catch (err) {
            errors.push({file, error: err.message});
        }
    }

    return {books, errors};
}

module.exports = {
    SUPPORTED_EXTENSIONS,
    isSupported,
    walkBookFiles,
    parseBookFile,
    importFolder,
    PARSERS
};
