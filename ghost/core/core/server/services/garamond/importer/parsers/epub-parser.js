// # EPUB parser
//
// Walks the EPUB spine in reading order and joins each spine item's HTML.
// Then the shared splitter cuts the result into chapters on h1/h2/h3. The
// spine order is the canonical "what to read next" sequence per the EPUB
// spec, which works for the vast majority of trade ebooks; broken EPUBs
// get reported as per-file errors by the importer.
const BookParser = require('../parser-base');
const {splitHtmlByHeadings, deriveTitle, stripTags} = require('../chapter-splitter');

// Map epub2's spine-item callback API (`getChapter(id, cb)`) onto a Promise.
function getChapter(epub, id) {
    return new Promise((resolve, reject) => {
        epub.getChapter(id, (err, text) => {
            if (err) {
                reject(err);
            } else {
                resolve(text);
            }
        });
    });
}

function openEpub(filePath) {
    const EPub = require('epub2').EPub;
    return new Promise((resolve, reject) => {
        const epub = new EPub(filePath);
        epub.on('end', () => resolve(epub));
        epub.on('error', reject);
        epub.parse();
    });
}

class EpubParser extends BookParser {
    constructor() {
        super();
        this.format = 'epub';
    }

    async parse(filePath) {
        const epub = await openEpub(filePath);

        const parts = [];
        for (const item of epub.flow) {
            try {
                const html = await getChapter(epub, item.id);
                parts.push(html);
            } catch (err) {
                // Skip unreadable spine items rather than killing the whole book
                // eslint-disable-next-line no-console
                console.warn(`epub: skipping spine item ${item.id}: ${err.message}`);
            }
        }

        const combined = parts.join('\n');
        const chapters = splitHtmlByHeadings(combined);

        const title = (epub.metadata && epub.metadata.title)
            || deriveTitle(chapters, filePath)
            || stripTags((chapters[0] && chapters[0].title) || '');

        return {title, chapters};
    }
}

module.exports = EpubParser;
