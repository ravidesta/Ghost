const assert = require('node:assert/strict');

const RtfParser = require('../../../../../core/server/services/garamond/importer/parsers/rtf-parser');
const {rtfToText} = RtfParser;

describe('Garamond: RTF parser', function () {
    describe('rtfToText', function () {
        it('extracts plain text from a minimal RTF', function () {
            const rtf = '{\\rtf1\\ansi Hello world.}';
            assert.equal(rtfToText(rtf), 'Hello world.');
        });

        it('turns \\par into newlines', function () {
            const rtf = '{\\rtf1 Line one\\par Line two}';
            assert.equal(rtfToText(rtf), 'Line one\n Line two');
        });

        it('strips control words but keeps the text after them', function () {
            const rtf = '{\\rtf1 {\\b bold} and {\\i italic}}';
            assert.equal(rtfToText(rtf).trim(), 'bold and italic');
        });

        it('decodes \\\'XX hex escapes', function () {
            // 0xe9 is 'é' in windows-1252
            const rtf = "{\\rtf1 caf\\'e9}";
            assert.match(rtfToText(rtf), /café/);
        });

        it('handles nested groups', function () {
            const rtf = '{\\rtf1 {\\fonttbl {\\f0 Times;}}{\\colortbl ;\\red0\\green0\\blue0;}Body text.}';
            assert.match(rtfToText(rtf), /Body text\./);
        });

        it('returns an empty string for non-string input', function () {
            assert.equal(rtfToText(null), '');
            assert.equal(rtfToText(undefined), '');
        });
    });
});
