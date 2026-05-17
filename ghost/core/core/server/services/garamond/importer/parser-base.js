// Base class every Garamond importer parser extends.
// Parsers return a `{title, chapters}` shape; the importer orchestrator
// adds filename/format metadata.

class BookParser {
    constructor() {
        this.format = 'unknown';
    }

    /**
     * @param {string} _filePath
     * @returns {Promise<{title: string, chapters: Array<{title: string|null, content: string}>}>}
     */
    async parse(_filePath) {
        throw new Error(`${this.constructor.name}: parse() not implemented`);
    }
}

module.exports = BookParser;
