// # System prompt builder
//
// Pure: takes a snapshot of the author's world (memory, catalog, recent
// balance) and produces the system prompt the concierge runs under.
// Kept pure so we can test the framing logic exhaustively without
// touching Claude or the database.

const PREAMBLE = `You are the author concierge for Garamond, a publishing platform.

You are speaking with one specific author about their work. You know their catalog, their stated goals, their preferences, and a rolling history of past conversations. Your job is to help them think clearly about strategy: what to write next, which series to push, when to launch, how to price, how to grow an audience.

Voice: warm, candid, literary. Never sycophantic. Push back on weak ideas. Surface tradeoffs. Cite the catalog when relevant ("your trilogy is now 80% of pending royalties — that argues for a fourth book before a new series").

When the author asks you to remember something, acknowledge that you have and write it to memory using the [[REMEMBER: key=value]] tag at the end of your reply. The platform will parse and store these tags automatically. Use lowercase, hyphenated keys (e.g. "publishing-pace", "current-project", "audience-segment").

Do not invent facts about books or sales that aren't in the snapshot. If you don't know, say so.`;

function _formatMemory(memory) {
    if (!memory || memory.length === 0) {
        return '(no remembered facts yet)';
    }
    return memory
        .map(m => `- ${m.key}: ${m.value}`)
        .join('\n');
}

function _formatCatalog(books, series) {
    if ((!books || books.length === 0) && (!series || series.length === 0)) {
        return '(no published books or series yet)';
    }
    const lines = [];
    if (series && series.length) {
        lines.push('Series:');
        for (const s of series) {
            lines.push(`- ${s.name}${s.description ? ` — ${s.description.slice(0, 120)}` : ''}`);
        }
    }
    if (books && books.length) {
        lines.push('Books:');
        for (const b of books) {
            const price = b.price_cents ? ` ($${(b.price_cents / 100).toFixed(2)})` : ' (free)';
            const seriesTag = b.series_position ? ` [book ${b.series_position}]` : '';
            lines.push(`- ${b.title}${seriesTag}${price} — ${b.status}`);
        }
    }
    return lines.join('\n');
}

function _formatBalance(balance) {
    if (!balance || Object.keys(balance).length === 0) {
        return '(no pending royalties)';
    }
    return Object.entries(balance)
        .map(([currency, cents]) => `${currency.toUpperCase()}: $${(cents / 100).toFixed(2)}`)
        .join(', ');
}

/**
 * @param {Object} snapshot
 * @param {Object} snapshot.author        - {id, name, slug}
 * @param {Array}  snapshot.memory        - rows from author_memory
 * @param {Array}  snapshot.books         - published books
 * @param {Array}  snapshot.series        - series
 * @param {Object} snapshot.balance       - {currency: cents} pending royalties
 * @returns {string}
 */
function buildSystemPrompt(snapshot = {}) {
    const {author = {}, memory = [], books = [], series = [], balance = {}} = snapshot;

    return [
        PREAMBLE,
        '',
        `## Author`,
        `Name: ${author.name || '(unknown)'}`,
        '',
        `## Remembered facts`,
        _formatMemory(memory),
        '',
        `## Catalog snapshot`,
        _formatCatalog(books, series),
        '',
        `## Pending royalties`,
        _formatBalance(balance)
    ].join('\n');
}

module.exports = {
    buildSystemPrompt,
    PREAMBLE,
    _formatMemory,
    _formatCatalog,
    _formatBalance
};
