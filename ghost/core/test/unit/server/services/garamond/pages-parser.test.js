const assert = require('node:assert/strict');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const PagesParser = require('../../../../../core/server/services/garamond/importer/parsers/pages-parser');

describe('Garamond: Pages parser', function () {
    let tmpDir;

    beforeEach(async function () {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'garamond-pages-test-'));
    });

    afterEach(async function () {
        if (tmpDir) {
            await fs.remove(tmpDir);
        }
    });

    it('declares the known preview.pdf candidates', function () {
        assert.ok(PagesParser.PREVIEW_CANDIDATES.includes('preview.pdf'));
        assert.ok(PagesParser.PREVIEW_CANDIDATES.includes('QuickLook/Preview.pdf'));
    });

    it('surfaces a clear error when the file is not a zip at all', async function () {
        const file = path.join(tmpDir, 'notazip.pages');
        await fs.writeFile(file, 'not a zip');
        await assert.rejects(
            () => new PagesParser().parse(file),
            /Pages bundle|adm-zip|Invalid/i
        );
    });
});
