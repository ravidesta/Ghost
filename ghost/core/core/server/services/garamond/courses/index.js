// # Garamond courses
//
// Orchestrates "coursify a book": pulls the book + its chapters out of
// the model layer, runs them through the coursify AI task, and upserts
// the result into book_courses. The author then edits the structure
// JSON via the admin endpoints, no AI in the loop.
const errors = require('@tryghost/errors');
const ai = require('../ai');

let _models;
function models() {
    if (!_models) {
        _models = require('../../../models');
    }
    return _models;
}

/**
 * Run a book through the AI coursifier and persist the result.
 * Idempotent: rerunning replaces the structure but keeps the same row
 * so the course id is stable across regenerations.
 *
 * @param {Object} args
 * @param {string} args.bookId
 * @param {string} [args.model]
 * @returns {Promise<Object>} the upserted BookCourse row, plain JSON
 */
async function coursifyBook({bookId, model}) {
    if (!bookId) {
        throw new errors.BadRequestError({message: 'bookId is required'});
    }

    const {Book, BookChapter, BookCourse} = models();
    const book = await Book.findOne({id: bookId}, {require: false});
    if (!book) {
        throw new errors.NotFoundError({message: 'Book not found'});
    }

    const chaptersCollection = await BookChapter.findAll({
        filter: `book_id:${bookId}`,
        order: 'position asc'
    });
    const chapters = chaptersCollection.models.map(m => m.toJSON());
    if (chapters.length === 0) {
        throw new errors.BadRequestError({message: 'Book has no chapters to coursify.'});
    }

    const aiResult = await ai.coursifyBook({
        book: book.toJSON(),
        chapters,
        model
    });

    if (!aiResult.structure) {
        throw new errors.InternalServerError({
            message: 'Coursify model returned malformed JSON. Try again or pick a different model.'
        });
    }

    const existing = await BookCourse.findOne({book_id: bookId}, {require: false});
    const payload = {
        book_id: bookId,
        title: aiResult.structure.title || `${book.get('title')} — Course`,
        description: aiResult.structure.description || null,
        structure: JSON.stringify(aiResult.structure),
        generated_by_model: aiResult.model
    };
    if (existing) {
        await existing.save(payload, {patch: true});
        return existing.toJSON();
    }
    const created = await BookCourse.add({...payload, status: 'draft'});
    return created.toJSON();
}

/**
 * Read the course (if any) attached to a book.
 *
 * @param {string} bookId
 * @returns {Promise<Object|null>}
 */
async function getCourse(bookId) {
    const {BookCourse} = models();
    const row = await BookCourse.findOne({book_id: bookId}, {require: false});
    return row ? row.toJSON() : null;
}

/**
 * Author-curated edit of the course structure JSON. The platform does
 * no validation beyond "is it JSON" — author owns the shape.
 *
 * @param {Object} args
 * @param {string} args.bookId
 * @param {Object} args.structure
 * @param {string} [args.title]
 * @param {string} [args.description]
 */
async function updateCourse({bookId, structure, title, description}) {
    const {BookCourse} = models();
    const row = await BookCourse.findOne({book_id: bookId}, {require: false});
    if (!row) {
        throw new errors.NotFoundError({message: 'No course exists for this book — coursify it first.'});
    }
    const patch = {};
    if (structure !== undefined) {
        patch.structure = JSON.stringify(structure);
    }
    if (title !== undefined) {
        patch.title = title;
    }
    if (description !== undefined) {
        patch.description = description;
    }
    await row.save(patch, {patch: true});
    return row.toJSON();
}

/**
 * Flip a course from draft to published (or back).
 *
 * @param {Object} args
 * @param {string} args.bookId
 * @param {string} args.status - 'draft' | 'published' | 'archived'
 */
async function setStatus({bookId, status}) {
    if (!['draft', 'published', 'archived'].includes(status)) {
        throw new errors.BadRequestError({message: `Invalid course status: ${status}`});
    }
    const {BookCourse} = models();
    const row = await BookCourse.findOne({book_id: bookId}, {require: false});
    if (!row) {
        throw new errors.NotFoundError({message: 'No course for this book.'});
    }
    await row.save({status}, {patch: true});
    return row.toJSON();
}

module.exports = {
    coursifyBook,
    getCourse,
    updateCourse,
    setStatus
};
