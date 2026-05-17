// # Static site publisher
//
// Takes a map of {path → htmlString} and uploads each entry to the
// configured storage backend (Azure Blob, S3, local — anything that
// exposes `saveRaw(buffer, targetPath, options)`). Returns the public
// URL for the homepage so callers can show "Your site is live at … ".
const {getStorage} = require('../../../adapters/storage');

const HTML_CACHE_CONTROL = 'public, max-age=300, must-revalidate';

/**
 * @param {Object} args
 * @param {string} args.authorSlug
 * @param {Object.<string, string>} args.pages - {relativePath: htmlString}
 * @returns {Promise<{homepageUrl: string, paths: string[]}>}
 */
async function publish({authorSlug, pages}) {
    if (!authorSlug) {
        throw new Error('publish: authorSlug is required');
    }
    if (!pages || typeof pages !== 'object') {
        throw new Error('publish: pages map is required');
    }

    const storage = getStorage();
    const prefix = `authors/${authorSlug}`;
    let homepageUrl = null;
    const written = [];

    for (const [relPath, html] of Object.entries(pages)) {
        const target = `${prefix}/${relPath}`.replace(/\/+/g, '/');
        // eslint-disable-next-line no-await-in-loop
        const url = await storage.saveRaw(Buffer.from(html, 'utf8'), target, {
            contentType: 'text/html; charset=utf-8',
            cacheControl: HTML_CACHE_CONTROL
        });
        written.push(target);
        if (relPath === 'index.html' || relPath === '/index.html') {
            homepageUrl = url;
        }
    }

    return {homepageUrl, paths: written};
}

module.exports = {publish, HTML_CACHE_CONTROL};
