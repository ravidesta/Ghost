// # RTF parser
//
// RTF is verbose but its plain-text content is recoverable with a small
// state machine — no external lib needed. We strip control words, group
// braces, and hex/unicode escapes, then look for "Chapter N" markers
// just like the text parser. Headings encoded as RTF `\par` + bold runs
// are not detected as h1/h2/h3 here; a future revision can lift those.
const fs = require('fs-extra');
const BookParser = require('../parser-base');
const {splitTextByChapters, deriveTitle} = require('../chapter-splitter');

/**
 * Decode RTF source into plain text. Handles:
 *   - control words like \b, \par, \line (mapped to whitespace where useful)
 *   - \'XX hex escapes (windows-1252-ish; we map to the codepoint)
 *   - \uNNNN unicode escapes
 *   - group braces {} (stripped)
 *
 * @param {string} src
 * @returns {string}
 */
function rtfToText(src) {
    if (typeof src !== 'string') {
        return '';
    }

    let out = '';
    let i = 0;
    let skipNext = 0; // characters to skip after a unicode escape (alt-char fallback)

    while (i < src.length) {
        const ch = src[i];

        if (ch === '\\') {
            // hex escape
            if (src[i + 1] === "'") {
                const hex = src.slice(i + 2, i + 4);
                const code = parseInt(hex, 16);
                if (!Number.isNaN(code)) {
                    out += String.fromCharCode(code);
                }
                i += 4;
                continue;
            }
            // unicode escape \uNNNN
            if (src[i + 1] === 'u' && /[-0-9]/.test(src[i + 2])) {
                let j = i + 2;
                while (j < src.length && /[-0-9]/.test(src[j])) {
                    j++;
                }
                const code = parseInt(src.slice(i + 2, j), 10);
                if (!Number.isNaN(code)) {
                    out += String.fromCharCode(code < 0 ? code + 0x10000 : code);
                }
                i = j;
                // an alt-char usually follows; skip it
                if (src[i] === '?' || /\S/.test(src[i] || '')) {
                    skipNext = 1;
                }
                continue;
            }
            // control word
            if (/[A-Za-z]/.test(src[i + 1])) {
                let j = i + 1;
                while (j < src.length && /[A-Za-z]/.test(src[j])) {
                    j++;
                }
                const word = src.slice(i + 1, j);
                // optional numeric parameter
                while (j < src.length && /[-0-9]/.test(src[j])) {
                    j++;
                }
                // a trailing space is part of the control word, swallow it
                if (src[j] === ' ') {
                    j++;
                }
                if (word === 'par' || word === 'line' || word === 'sect') {
                    out += '\n';
                } else if (word === 'tab') {
                    out += '\t';
                }
                i = j;
                continue;
            }
            // escaped backslash / brace
            if (src[i + 1] === '\\' || src[i + 1] === '{' || src[i + 1] === '}') {
                out += src[i + 1];
                i += 2;
                continue;
            }
            // unknown escape — skip the backslash
            i++;
            continue;
        }

        if (ch === '{' || ch === '}') {
            i++;
            continue;
        }

        if (skipNext > 0) {
            skipNext--;
            i++;
            continue;
        }

        if (ch !== '\r') {
            out += ch;
        }
        i++;
    }

    return out
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

class RtfParser extends BookParser {
    constructor() {
        super();
        this.format = 'rtf';
    }

    async parse(filePath) {
        const raw = await fs.readFile(filePath, 'utf8');
        const text = rtfToText(raw);
        const chapters = splitTextByChapters(text);
        return {
            title: deriveTitle(chapters, filePath),
            chapters
        };
    }
}

module.exports = RtfParser;
module.exports.rtfToText = rtfToText;
