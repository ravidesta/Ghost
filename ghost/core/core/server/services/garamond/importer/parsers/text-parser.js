// # Text parser
//
// Handles `.txt`, `.md`, `.markdown`. The simplest case — chapters are
// split on markdown headings (`# `, `## `, `### `) or, for plain text,
// on lines that look like "Chapter N" / "Chapter N: …". Files without
// any explicit chapter markers become a single-chapter book.
const fs = require('fs-extra');
const path = require('path');
const BookParser = require('../parser-base');

const MD_HEADING_RE = /^(#{1,3})\s+(.+?)\s*$/;
const PLAIN_CHAPTER_RE = /^\s*(?:CHAPTER|Chapter)\s+(?:[0-9]+|[IVXLCDM]+)(?:\s*[:.\-—]\s*(.+))?\s*$/;

function deriveTitle(filename, firstHeading) {
    if (firstHeading) {
        return firstHeading;
    }
    return path.basename(filename, path.extname(filename))
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

class TextParser extends BookParser {
    constructor() {
        super();
        this.format = 'text';
    }

    async parse(filePath) {
        const raw = await fs.readFile(filePath, 'utf8');
        const lines = raw.split(/\r?\n/);

        const chapters = [];
        let current = {title: null, lines: []};
        let firstHeading = null;

        for (const line of lines) {
            const mdMatch = line.match(MD_HEADING_RE);
            const plainMatch = line.match(PLAIN_CHAPTER_RE);

            if (mdMatch || plainMatch) {
                if (current.title !== null || current.lines.length > 0) {
                    chapters.push({title: current.title, content: current.lines.join('\n').trim()});
                }
                const title = mdMatch ? mdMatch[2] : (plainMatch[1] || line.trim());
                if (!firstHeading) {
                    firstHeading = title;
                }
                current = {title, lines: []};
            } else {
                current.lines.push(line);
            }
        }
        if (current.title !== null || current.lines.length > 0) {
            chapters.push({title: current.title, content: current.lines.join('\n').trim()});
        }

        // If we found no headings at all, the whole file is one untitled chapter.
        if (chapters.length === 1 && chapters[0].title === null) {
            chapters[0] = {title: null, content: chapters[0].content};
        }

        return {
            title: deriveTitle(filePath, firstHeading),
            chapters
        };
    }
}

module.exports = TextParser;
