// # PDF parser
//
// Extracts the text via pdf-parse, then splits on either "Chapter N" lines
// or visual breaks (a run of blank lines followed by an ALL-CAPS or
// Title-Case line). PDFs are a notoriously messy source — page numbers and
// running headers tend to leak through. We strip the most common artifacts
// before splitting.
const fs = require('fs-extra');
const BookParser = require('../parser-base');
const {splitTextByChapters, deriveTitle} = require('../chapter-splitter');

// Drop bare page numbers (a line containing only digits) and obvious
// running-header noise (e.g. "Page 12 of 240").
function cleanPdfArtifacts(text) {
    return text
        .replace(/^[ \t]*[0-9]+[ \t]*$/gm, '')
        .replace(/^[ \t]*Page \d+( of \d+)?[ \t]*$/gim, '')
        // collapse 3+ newlines to two
        .replace(/\n{3,}/g, '\n\n')
        // fix the classic PDF hyphenated line-break
        .replace(/([a-z])-\n([a-z])/g, '$1$2');
}

class PdfParser extends BookParser {
    constructor() {
        super();
        this.format = 'pdf';
    }

    async parse(filePath) {
        const pdfParse = require('pdf-parse');
        const buffer = await fs.readFile(filePath);
        const result = await pdfParse(buffer);

        const cleaned = cleanPdfArtifacts(result.text || '');
        const chapters = splitTextByChapters(cleaned);

        const metaTitle = result.info && result.info.Title;
        const title = (typeof metaTitle === 'string' && metaTitle.trim())
            || deriveTitle(chapters, filePath);

        return {title, chapters};
    }
}

module.exports = PdfParser;
module.exports.cleanPdfArtifacts = cleanPdfArtifacts;
