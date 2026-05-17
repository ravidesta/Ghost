// # DOCX parser
//
// Uses `mammoth` to convert the Word XML into HTML, preserving heading
// levels. We map Heading 1 → h1, Heading 2 → h2, Heading 3 → h3, then
// hand the result to the shared HTML splitter. Comments are dropped here;
// importing them as editor commentary is a follow-up.
const BookParser = require('../parser-base');
const {splitHtmlByHeadings, deriveTitle} = require('../chapter-splitter');

const STYLE_MAP = [
    "p[style-name='Heading 1'] => h1",
    "p[style-name='Heading 2'] => h2",
    "p[style-name='Heading 3'] => h3",
    "p[style-name='Title'] => h1",
    "p[style-name='Subtitle'] => h2",
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em"
];

class DocxParser extends BookParser {
    constructor() {
        super();
        this.format = 'docx';
    }

    async parse(filePath) {
        const mammoth = require('mammoth');
        const result = await mammoth.convertToHtml({path: filePath}, {styleMap: STYLE_MAP});
        const html = result.value || '';

        const chapters = splitHtmlByHeadings(html);
        return {
            title: deriveTitle(chapters, filePath),
            chapters
        };
    }
}

module.exports = DocxParser;
