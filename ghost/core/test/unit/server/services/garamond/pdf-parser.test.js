const assert = require('node:assert/strict');

const {cleanPdfArtifacts} = require('../../../../../core/server/services/garamond/importer/parsers/pdf-parser');

describe('Garamond: PDF parser — cleanPdfArtifacts', function () {
    it('drops bare page numbers on their own line', function () {
        const input = 'Some text.\n12\nMore text.';
        const out = cleanPdfArtifacts(input);
        assert.equal(out.includes('\n12\n'), false);
        assert.match(out, /Some text\./);
        assert.match(out, /More text\./);
    });

    it('drops "Page N of M" running headers', function () {
        const input = 'Body.\nPage 3 of 240\nMore body.';
        assert.equal(cleanPdfArtifacts(input).includes('Page 3 of 240'), false);
    });

    it('rejoins hyphenated line breaks', function () {
        const input = 'It was a daunt-\ning task indeed.';
        assert.match(cleanPdfArtifacts(input), /daunting task/);
    });

    it('collapses 3+ blank lines into a double newline', function () {
        const input = 'A\n\n\n\nB';
        assert.equal(cleanPdfArtifacts(input), 'A\n\nB');
    });

    it('leaves clean text alone', function () {
        const input = 'Chapter One\n\nA paragraph.';
        assert.equal(cleanPdfArtifacts(input), input);
    });
});
