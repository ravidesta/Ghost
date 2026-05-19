const errors = require('@tryghost/errors');
const {courses} = require('../../services/garamond');

// TODO(garamond): swap to `permissions: true` once the populate-permissions
// migration adds a `course` permission. mw.authAdminApi already restricts
// these to admin users.
const PUBLIC = false;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'book_courses',

    /**
     * GET /books/:id/course
     * Returns the saved course (with structure already parsed to an
     * object so callers don't have to JSON.parse).
     */
    read: {
        headers: {cacheInvalidate: false},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const row = await courses.getCourse(frame.options.id);
            if (!row) {
                return {course: null};
            }
            const decoded = {...row};
            if (row.structure) {
                try {
                    decoded.structure = JSON.parse(row.structure);
                } catch {
                    decoded.structure = null;
                }
            }
            return {course: decoded};
        }
    },

    /**
     * POST /books/:id/course/coursify
     * Body (optional): { book_courses: [{ model? }] }
     * Generates the course via AI and upserts the book_courses row.
     */
    coursify: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const opts = frame.data?.book_courses?.[0] || {};
            const row = await courses.coursifyBook({
                bookId: frame.options.id,
                model: opts.model
            });
            return {course: row};
        }
    },

    /**
     * PUT /books/:id/course
     * Body: { book_courses: [{ structure?, title?, description? }] }
     * Author-curated edits to the course.
     */
    edit: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data?.book_courses?.[0] || {};
            const row = await courses.updateCourse({
                bookId: frame.options.id,
                structure: payload.structure,
                title: payload.title,
                description: payload.description
            });
            return {course: row};
        }
    },

    /**
     * POST /books/:id/course/publish
     * Body: { book_courses: [{ status: 'draft'|'published'|'archived' }] }
     */
    publish: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data?.book_courses?.[0] || {};
            if (!payload.status) {
                throw new errors.BadRequestError({message: 'status is required.'});
            }
            const row = await courses.setStatus({
                bookId: frame.options.id,
                status: payload.status
            });
            return {course: row};
        }
    }
};

module.exports = controller;
