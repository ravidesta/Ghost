// # Author concierge
//
// One Claude per author with persistent memory of their catalog, goals,
// and prior conversations. The author talks to it through a single
// `chat` endpoint; everything else (loading the snapshot, persisting
// the reply, parsing REMEMBER tags) happens here.
const errors = require('@tryghost/errors');
const ai = require('../../ai');
const royalties = require('../royalties');
const {buildSystemPrompt} = require('./system-prompt');
const {parseMemoryTags} = require('./memory-tags');

const HISTORY_LIMIT = 12; // last N messages of turn-by-turn context
const MAX_TOKENS = 2048;

let _models;
function models() {
    if (!_models) {
        _models = require('../../../models');
    }
    return _models;
}

async function _loadSnapshot(authorId) {
    const {User, Book, Series, AuthorMemory} = models();

    const userModel = await User.findOne({id: authorId}, {require: false});
    if (!userModel) {
        throw new errors.NotFoundError({message: 'Author not found'});
    }

    const author = {
        id: userModel.get('id'),
        name: userModel.get('name'),
        slug: userModel.get('slug')
    };

    const memoryCollection = await AuthorMemory.findAll({
        filter: `author_id:${authorId}`,
        order: 'updated_at desc'
    });
    const memory = memoryCollection.models.map(m => ({
        key: m.get('key'),
        value: m.get('value'),
        source: m.get('source')
    }));

    const booksCollection = await Book.findAll({
        filter: `author_id:${authorId}`,
        order: 'published_at desc'
    });
    const books = booksCollection.models.map(m => m.toJSON());

    const seriesIds = [...new Set(books.map(b => b.series_id).filter(Boolean))];
    let series = [];
    if (seriesIds.length > 0) {
        const filter = seriesIds.map(id => `id:${id}`).join(',');
        const seriesCollection = await Series.findAll({filter});
        series = seriesCollection.models.map(m => m.toJSON());
    }

    const balance = await royalties.getAuthorBalance(authorId);

    return {author, memory, books, series, balance};
}

async function _loadHistory(authorId) {
    const {ConciergeMessage} = models();
    const collection = await ConciergeMessage.findPage({
        filter: `author_id:${authorId}`,
        order: 'created_at desc',
        limit: HISTORY_LIMIT
    });
    return collection.data
        .map(m => ({
            role: m.get('role'),
            content: m.get('content')
        }))
        .reverse();
}

async function _persistMessage({authorId, role, content, model, usage}) {
    const {ConciergeMessage} = models();
    await ConciergeMessage.add({
        author_id: authorId,
        role,
        content,
        model: model || null,
        token_usage: usage ? JSON.stringify(usage) : null
    });
}

async function _writeMemory({authorId, facts}) {
    if (!facts || facts.length === 0) {
        return [];
    }
    const {AuthorMemory} = models();
    const upserted = [];
    for (const fact of facts) {
        const existing = await AuthorMemory.findOne(
            {author_id: authorId, key: fact.key},
            {require: false}
        );
        if (existing) {
            await existing.save({value: fact.value, source: 'inferred'}, {patch: true});
        } else {
            await AuthorMemory.add({
                author_id: authorId,
                key: fact.key,
                value: fact.value,
                source: 'inferred',
                confidence: 80
            });
        }
        upserted.push(fact);
    }
    return upserted;
}

/**
 * Send a message to the author's concierge. Returns the assistant reply
 * with the REMEMBER tags stripped, plus the list of facts persisted to
 * author_memory as a side-effect.
 *
 * @param {Object} args
 * @param {string} args.authorId
 * @param {string} args.message
 * @param {string} [args.model]
 */
async function chat({authorId, message, model}) {
    if (!authorId || !message) {
        throw new errors.BadRequestError({message: 'authorId and message are required'});
    }

    const snapshot = await _loadSnapshot(authorId);
    const history = await _loadHistory(authorId);
    const systemPrompt = buildSystemPrompt(snapshot);

    // Persist the user message first so the audit trail is complete even
    // if the model call fails.
    await _persistMessage({authorId, role: 'user', content: message});

    // The concierge is intentionally pinned to Claude — Anthropic is the
    // current best at long-context conversational memory work. Override
    // via the `model` argument if a deploy wants a different model id.
    const provider = ai.getProvider('anthropic');
    if (!provider.isAvailable()) {
        throw new errors.InternalServerError({message: 'Anthropic provider is not configured'});
    }

    const turns = [
        ...history,
        {role: 'user', content: message}
    ];
    // Flatten the turn list into a single user prompt so we can use the
    // generateText interface uniformly. Claude does best with explicit
    // role tags; the AI provider abstraction layers them into the API
    // call.
    const transcript = turns
        .map(t => `${t.role === 'assistant' ? 'CONCIERGE' : 'AUTHOR'}: ${t.content}`)
        .join('\n\n');

    const result = await provider.generateText({
        system: systemPrompt,
        prompt: `Here is the conversation so far. Reply as CONCIERGE.\n\n${transcript}`,
        maxTokens: MAX_TOKENS,
        model
    });

    const {strippedText, facts} = parseMemoryTags(result.text);

    await _persistMessage({
        authorId,
        role: 'assistant',
        content: strippedText,
        model: result.model,
        usage: result.usage
    });

    const persistedFacts = await _writeMemory({authorId, facts});

    return {
        reply: strippedText,
        model: result.model,
        rememberedFacts: persistedFacts
    };
}

/**
 * Return everything the concierge currently remembers about the author.
 * Useful for a "memory inspector" UI so the author can see and edit
 * what the assistant believes about them.
 */
async function getMemory(authorId) {
    const {AuthorMemory} = models();
    const collection = await AuthorMemory.findAll({
        filter: `author_id:${authorId}`,
        order: 'updated_at desc'
    });
    return collection.models.map(m => ({
        id: m.get('id'),
        key: m.get('key'),
        value: m.get('value'),
        source: m.get('source'),
        confidence: m.get('confidence'),
        updated_at: m.get('updated_at')
    }));
}

/**
 * Manually write a fact into the author's memory (e.g. from the
 * onboarding form before any conversation exists).
 */
async function setMemory({authorId, key, value}) {
    if (!authorId || !key) {
        throw new errors.BadRequestError({message: 'authorId and key are required'});
    }
    const {AuthorMemory} = models();
    const existing = await AuthorMemory.findOne({author_id: authorId, key}, {require: false});
    if (existing) {
        return existing.save({value, source: 'user'}, {patch: true});
    }
    return AuthorMemory.add({
        author_id: authorId,
        key,
        value,
        source: 'user',
        confidence: 100
    });
}

module.exports = {
    chat,
    getMemory,
    setMemory,
    buildSystemPrompt,
    parseMemoryTags,
    HISTORY_LIMIT
};
