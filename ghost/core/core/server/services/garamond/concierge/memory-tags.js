// # Memory tag parser
//
// The concierge writes back to its own memory by emitting
//   [[REMEMBER: key=value]]
// tags at the end of replies. This module finds them in a response,
// returns the stripped text + the parsed (key, value) pairs, and
// validates the keys look like reasonable identifiers.
//
// Pure — easy to unit-test.

const TAG_RE = /\[\[REMEMBER:\s*([a-z][a-z0-9-]{1,80})\s*=\s*([^\]]+?)\s*\]\]/gi;

/**
 * @param {string} text
 * @returns {{strippedText: string, facts: {key: string, value: string}[]}}
 */
function parseMemoryTags(text) {
    if (typeof text !== 'string') {
        return {strippedText: '', facts: []};
    }

    const facts = [];
    let match;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(text)) !== null) {
        facts.push({
            key: match[1].toLowerCase(),
            value: match[2].trim()
        });
    }

    // De-duplicate by key — last write wins, matching how author_memory
    // upsert behaves.
    const byKey = {};
    for (const fact of facts) {
        byKey[fact.key] = fact;
    }
    const dedup = Object.values(byKey);

    const strippedText = text.replace(TAG_RE, '').trim();
    return {strippedText, facts: dedup};
}

module.exports = {parseMemoryTags, TAG_RE};
