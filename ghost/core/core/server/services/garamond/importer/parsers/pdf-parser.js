// # PDF parser (stub)
//
// Real implementation will use pdfjs-dist or pdf-parse to extract text
// per page, then use heuristics (font size jumps, "Chapter N" lines,
// page breaks after a centred large-text line) to detect chapter
// boundaries. PDF artifacts — running headers, page numbers, hyphenated
// linebreaks — get cleaned here too.
const BookParser = require('../parser-base');

class PdfParser extends BookParser {
    constructor() {
        super();
        this.format = 'pdf';
    }

    async parse(_filePath) {
        throw new Error('PDF parsing is not implemented yet');
    }
}

module.exports = PdfParser;
