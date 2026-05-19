// # Coursify book
//
// Turns a book into a self-paced course outline. Each chapter usually
// becomes one module with 2-4 lessons (one reading lesson plus a mix
// of exercise, quiz, and discussion lessons). Output is JSON the
// platform stores in book_courses.structure and the author can edit.

const {resolveProvider} = require('../router');

const SYSTEM_PROMPT = [
    'You are a course designer for the Garamond publishing platform.',
    'Given a book broken into chapters, produce a self-paced course outline.',
    'Rules:',
    '- One module per chapter unless two chapters are so closely linked they belong together.',
    '- Each module has 2-4 lessons. Always include exactly one "reading" lesson covering the chapter text. The rest may be:',
    '    exercise   — a concrete prompt the learner does on their own.',
    '    quiz       — 3-5 questions, each with options and a correctIndex.',
    '    discussion — an open prompt for a community thread.',
    '- Keep lesson titles short (under 60 chars). Keep prompts specific.',
    '- Do not invent content not implied by the chapter.',
    'Output a single JSON object with this shape (and ONLY this shape — no commentary, no code fences):',
    '{',
    '  "title": "string",',
    '  "description": "1-2 sentences",',
    '  "modules": [',
    '    {',
    '      "title": "string",',
    '      "sourceChapterPosition": 0,',
    '      "lessons": [',
    '        {"kind":"reading","title":"string","summary":"string"},',
    '        {"kind":"exercise","title":"string","prompt":"string"},',
    '        {"kind":"quiz","title":"string","questions":[{"q":"string","options":["a","b","c","d"],"correctIndex":0}]},',
    '        {"kind":"discussion","title":"string","prompt":"string"}',
    '      ]',
    '    }',
    '  ]',
    '}'
].join('\n');

const MAX_CHAPTER_CHARS = 6000; // truncate per-chapter excerpts to keep prompts bounded

function _summariseChapter(chapter, maxChars = MAX_CHAPTER_CHARS) {
    const content = (chapter.content || '').slice(0, maxChars);
    return {
        position: chapter.position ?? 0,
        title: chapter.title || `Chapter ${(chapter.position ?? 0) + 1}`,
        excerpt: content
    };
}

function _buildUserPrompt({book, chapters}) {
    const summarised = (chapters || [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(c => _summariseChapter(c));

    const lines = [
        `Book title: ${book.title}`,
        book.subtitle ? `Subtitle: ${book.subtitle}` : null,
        book.description ? `Description: ${book.description}` : null,
        '',
        `Chapters (${summarised.length}):`
    ].filter(Boolean);

    for (const c of summarised) {
        lines.push('');
        lines.push(`### Chapter ${c.position} — ${c.title}`);
        lines.push(c.excerpt);
    }

    return lines.join('\n');
}

function _safeParseJson(raw) {
    if (!raw) {
        return null;
    }
    const cleaned = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}

/**
 * @param {Object} args
 * @param {Object} args.book      - plain book row (id, title, subtitle, description)
 * @param {Array}  args.chapters  - plain chapter rows ({position, title, content})
 * @param {string} [args.model]
 */
async function coursifyBook({book, chapters, model}) {
    if (!book || !book.title) {
        throw new Error('coursifyBook: book with a title is required');
    }
    if (!Array.isArray(chapters) || chapters.length === 0) {
        throw new Error('coursifyBook: at least one chapter is required');
    }

    const {provider} = resolveProvider('summary'); // long-form structured text → Claude by default
    if (!provider) {
        throw new Error('coursifyBook: no AI provider is configured');
    }

    const result = await provider.generateText({
        system: SYSTEM_PROMPT,
        prompt: _buildUserPrompt({book, chapters}),
        maxTokens: 4096,
        model
    });

    return {
        provider: provider.name,
        model: result.model,
        structure: _safeParseJson(result.text)
    };
}

module.exports = coursifyBook;
module.exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
module.exports.MAX_CHAPTER_CHARS = MAX_CHAPTER_CHARS;
module.exports._summariseChapter = _summariseChapter;
module.exports._buildUserPrompt = _buildUserPrompt;
module.exports._safeParseJson = _safeParseJson;
