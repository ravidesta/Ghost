// # DOCX parser (stub)
//
// Real implementation will use `mammoth` to convert document.xml into
// HTML, preserving heading levels. Chapters are split on H1/H2 with
// configurable level. Tracked changes / comments either drop or import
// as editor commentary (per the Garamond product spec).
const BookParser = require('../parser-base');

class DocxParser extends BookParser {
    constructor() {
        super();
        this.format = 'docx';
    }

    async parse(_filePath) {
        throw new Error('DOCX parsing is not implemented yet');
    }
}

module.exports = DocxParser;
