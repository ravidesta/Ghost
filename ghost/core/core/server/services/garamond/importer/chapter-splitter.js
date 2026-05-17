// # Chapter splitter
//
// Shared utility used by every importer parser. Given raw HTML (or plain
// text) and a heading detection rule, returns a chapter list:
//
//   [{title: string|null, content: string}]
//
// Keeping this pure (no file I/O, no external libs) means we can test
// chapter-detection thoroughly without touching epubs/pdfs/docxs.

const HEADING_RE = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
const PLAIN_CHAPTER_RE = /^\s*(?:CHAPTER|Chapter)\s+(?:[0-9]+|[IVXLCDM]+)(?:\s*[:.\-—]\s*(.+))?\s*$/;

function stripTags(html) {
    return String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Split an HTML document into chapters at h1/h2/h3 boundaries. Each chapter
 * keeps its full HTML — embedded images, paragraphs, blockquotes, etc. —
 * so the editor renders the original formatting.
 *
 * @param {string} html
 * @returns {{title: string|null, content: string}[]}
 */
function splitHtmlByHeadings(html) {
    if (typeof html !== 'string' || html.length === 0) {
        return [{title: null, content: ''}];
    }

    const matches = [...html.matchAll(HEADING_RE)];
    if (matches.length === 0) {
        return [{title: null, content: html.trim()}];
    }

    const chapters = [];
    // Anything before the first heading is the prologue chapter.
    const prologue = html.slice(0, matches[0].index).trim();
    if (prologue) {
        chapters.push({title: null, content: prologue});
    }

    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const titleText = stripTags(m[2]);
        const start = m.index + m[0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
        const content = html.slice(start, end).trim();
        chapters.push({title: titleText || null, content});
    }

    return chapters;
}

/**
 * Split plain text on "Chapter N" / "Chapter N: …" markers.
 *
 * @param {string} text
 * @returns {{title: string|null, content: string}[]}
 */
function splitTextByChapters(text) {
    if (typeof text !== 'string' || text.length === 0) {
        return [{title: null, content: ''}];
    }

    const lines = text.split(/\r?\n/);
    const chapters = [];
    let current = {title: null, lines: []};

    for (const line of lines) {
        const match = line.match(PLAIN_CHAPTER_RE);
        if (match) {
            if (current.title !== null || current.lines.length > 0) {
                chapters.push({title: current.title, content: current.lines.join('\n').trim()});
            }
            current = {title: match[1] || line.trim(), lines: []};
        } else {
            current.lines.push(line);
        }
    }
    if (current.title !== null || current.lines.length > 0) {
        chapters.push({title: current.title, content: current.lines.join('\n').trim()});
    }

    return chapters;
}

/**
 * Derive a book title from the first heading or the filename.
 *
 * @param {{title: string|null}[]} chapters
 * @param {string} filename
 * @returns {string}
 */
function deriveTitle(chapters, filename) {
    const first = chapters.find(c => c.title);
    if (first) {
        return first.title;
    }
    const path = require('path');
    return path.basename(filename, path.extname(filename))
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

module.exports = {
    splitHtmlByHeadings,
    splitTextByChapters,
    deriveTitle,
    stripTags
};
