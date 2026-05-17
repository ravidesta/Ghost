const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');

const messages = {
    chapterNotFound: 'Chapter not found.'
};

// TODO(garamond): swap to `permissions: true` once the populate-permissions
// migration lands.
const PUBLIC = false;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'book_chapters',

    browse: {
        headers: {cacheInvalidate: false},
        options: ['bookId', 'order', 'page', 'limit'],
        permissions: PUBLIC,
        query(frame) {
            const opts = {...frame.options, order: frame.options.order || 'position asc'};
            if (frame.options.bookId) {
                opts.filter = `book_id:${frame.options.bookId}`;
            }
            return models.BookChapter.findPage(opts);
        }
    },

    add: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        options: ['bookId'],
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data.book_chapters[0];
            if (frame.options.bookId) {
                payload.book_id = frame.options.bookId;
            }

            if (payload.position === undefined) {
                // append to the end of the book by default
                const all = await models.BookChapter.findAll({
                    filter: `book_id:${payload.book_id}`
                });
                payload.position = all.length;
            }

            return models.BookChapter.add(payload, frame.options);
        }
    },

    edit: {
        headers: {cacheInvalidate: true},
        options: ['id', 'bookId'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const model = await models.BookChapter.edit(frame.data.book_chapters[0], frame.options);
            if (!model) {
                throw new errors.NotFoundError({message: tpl(messages.chapterNotFound)});
            }
            return model;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {cacheInvalidate: true},
        options: ['id', 'bookId'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        query(frame) {
            return models.BookChapter.destroy({...frame.options, require: true});
        }
    }
};

module.exports = controller;
