// # Text parser
//
// Handles `.txt`, `.md`, `.markdown`. Markdown headings (`#`/`##`/`###`)
// get converted to HTML tags first so the shared HTML splitter can do its
// thing; plain text falls back to "Chapter N" detection.
const fs = require('fs-extra');
const BookParser = require('../parser-base');
const {splitHtmlByHeadings, splitTextByChapters, deriveTitle} = require('../chapter-splitter');

const MD_HEADING_RE = /^(#{1,3})\s+(.+?)\s*$/gm;

function markdownHeadingsToHtml(text) {
    return text.replace(MD_HEADING_RE, (_, hashes, title) => {
        const level = hashes.length;
        return `<h${level}>${title.trim()}</h${level}>`;
    });
}

class TextParser extends BookParser {
    constructor() {
        super();
        this.format = 'text';
    }

    async parse(filePath) {
        const raw = await fs.readFile(filePath, 'utf8');

        // Markdown headings → HTML headings, then defer to the HTML splitter.
        const hasMarkdownHeadings = /^#{1,3}\s+/m.test(raw);
        const chapters = hasMarkdownHeadings
            ? splitHtmlByHeadings(markdownHeadingsToHtml(raw))
            : splitTextByChapters(raw);

        return {
            title: deriveTitle(chapters, filePath),
            chapters
        };
    }
}

module.exports = TextParser;
