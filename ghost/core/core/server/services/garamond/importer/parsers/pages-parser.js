// # Apple Pages parser
//
// .pages files are zip bundles. Since iWork '13 the bundle contains a
// `preview.pdf` that's a faithful rendering of the document. We pull
// that out and delegate to PdfParser — same chapter detection, same
// artifact cleanup. Legacy Pages '09 files (XML-based, no preview.pdf)
// are flagged explicitly so the importer can surface a clear error
// rather than producing a malformed book.
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const BookParser = require('../parser-base');
const PdfParser = require('./pdf-parser');

const PREVIEW_CANDIDATES = [
    'preview.pdf',
    'QuickLook/Preview.pdf',
    'Index/Preview.pdf'
];

function _extractPreviewPdf(filePath) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    for (const candidate of PREVIEW_CANDIDATES) {
        const entry = zip.getEntry(candidate);
        if (entry) {
            return entry.getData();
        }
    }
    return null;
}

class PagesParser extends BookParser {
    constructor() {
        super();
        this.format = 'pages';
        this._pdfParser = new PdfParser();
    }

    async parse(filePath) {
        let pdfBuffer;
        try {
            pdfBuffer = _extractPreviewPdf(filePath);
        } catch (err) {
            throw new Error(`Pages bundle could not be opened as a zip: ${err.message}`);
        }
        if (!pdfBuffer) {
            throw new Error(
                'Pages file has no embedded preview.pdf — likely a legacy iWork \'09 document. '
                + 'Open and re-save in modern Pages, or export to PDF manually.'
            );
        }

        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garamond-pages-'));
        const tmpPdf = path.join(tmpDir, 'preview.pdf');
        try {
            await fs.writeFile(tmpPdf, pdfBuffer);
            const parsed = await this._pdfParser.parse(tmpPdf);
            return parsed;
        } finally {
            await fs.remove(tmpDir).catch(() => {});
        }
    }
}

module.exports = PagesParser;
module.exports._extractPreviewPdf = _extractPreviewPdf;
module.exports.PREVIEW_CANDIDATES = PREVIEW_CANDIDATES;
