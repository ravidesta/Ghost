// # Apple Pages parser (stub)
//
// Apple Pages files are zip archives with an internal binary format
// (since iWork '13 — IWA, snappy-compressed Protocol Buffers). Practical
// path: detect old (XML) vs new (IWA) Pages and either:
//   - for legacy Pages '09: parse index.xml directly
//   - for modern Pages: shell out to `qlmanage` / `textutil` on macOS,
//     or run the file through `iwork-mcv` / similar to extract RTF/HTML
// Falling back to extracting just `preview.pdf` from the bundle and
// running it through PdfParser is the pragmatic default.
const BookParser = require('../parser-base');

class PagesParser extends BookParser {
    constructor() {
        super();
        this.format = 'pages';
    }

    async parse(_filePath) {
        throw new Error('Apple Pages parsing is not implemented yet');
    }
}

module.exports = PagesParser;
