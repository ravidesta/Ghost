// # EPUB parser (stub)
//
// EPUBs are zip archives containing XHTML spine items, an OPF manifest, and
// (usually) a navigation document. A real implementation will:
//   1. unzip the package (yauzl/jszip)
//   2. read `META-INF/container.xml` → locate the .opf
//   3. parse the OPF spine to get reading order
//   4. parse each XHTML spine item into a chapter, using <title> or the
//      first heading as the chapter title
//   5. strip embedded scripts/styles, keep semantic HTML for the editor
//
// Stubbed so the importer registers .epub and surfaces a clear error
// per-file rather than crashing the batch.
const BookParser = require('../parser-base');

class EpubParser extends BookParser {
    constructor() {
        super();
        this.format = 'epub';
    }

    async parse(_filePath) {
        throw new Error('EPUB parsing is not implemented yet');
    }
}

module.exports = EpubParser;
