const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');
const {storefront, packager} = require('../../services/garamond');

const messages = {
    bookNotFound: 'Book not found.',
    invalidImportPayload: 'Import payload must include a title and a chapters array.'
};

// TODO(garamond): swap to `permissions: true` once a populate-permissions
// migration adds the book/series/book_chapter rows to fixtures.json.
const PUBLIC = false;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'books',

    browse: {
        headers: {cacheInvalidate: false},
        options: ['filter', 'order', 'page', 'limit', 'include'],
        permissions: PUBLIC,
        query(frame) {
            return models.Book.findPage(frame.options);
        }
    },

    read: {
        headers: {cacheInvalidate: false},
        options: ['include'],
        data: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const model = await models.Book.findOne(frame.data, {
                ...frame.options,
                withRelated: (frame.options.withRelated || []).concat(['chapters', 'series'])
            });
            if (!model) {
                throw new errors.NotFoundError({message: tpl(messages.bookNotFound)});
            }
            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        permissions: PUBLIC,
        query(frame) {
            return models.Book.add(frame.data.books[0], frame.options);
        }
    },

    edit: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const model = await models.Book.edit(frame.data.books[0], frame.options);
            if (!model) {
                throw new errors.NotFoundError({message: tpl(messages.bookNotFound)});
            }
            return model;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        query(frame) {
            return models.Book.destroy({...frame.options, require: true});
        }
    },

    /**
     * Accept a parsed importer record (`{title, chapters: [{title, content}]}`)
     * and create the Book + BookChapter rows in a single transaction. Returns
     * the created Book with its chapters eager-loaded.
     */
    import: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        permissions: PUBLIC,
        async query(frame) {
            const payload = frame.data.books?.[0];
            if (!payload || !payload.title || !Array.isArray(payload.chapters)) {
                throw new errors.BadRequestError({message: tpl(messages.invalidImportPayload)});
            }

            const userId = frame.options.context?.user;
            const {title, subtitle, slug, description, font_pairing_id, chapters} = payload;

            const book = await models.Book.add({
                title,
                subtitle,
                slug,
                description,
                font_pairing_id,
                author_id: userId,
                created_by: userId,
                updated_by: userId
            }, frame.options);

            // Chapters preserve the order the importer produced.
            for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];
                await models.BookChapter.add({
                    book_id: book.id,
                    position: i,
                    title: chapter.title ?? null,
                    content: chapter.content ?? ''
                }, frame.options);
            }

            return models.Book.findOne({id: book.id}, {
                ...frame.options,
                withRelated: ['chapters']
            });
        }
    },

    /**
     * Build and return a .garamond bundle for the given book. Admin preview
     * only — gated member downloads will live on a separate route.
     */
    download: {
        headers: {
            cacheInvalidate: false,
            disposition: {
                type: 'file',
                value(result) {
                    return result.filename;
                }
            }
        },
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        response: {format: 'plain'},
        async query(frame) {
            const book = await models.Book.findOne({id: frame.options.id}, {withRelated: ['chapters']});
            if (!book) {
                throw new errors.NotFoundError({message: tpl(messages.bookNotFound)});
            }
            const bundle = packager.buildBundle({
                book: book.toJSON(),
                chapters: book.related('chapters').toJSON(),
                purchaserMemberId: null
            });
            frame.setHeader?.('Content-Type', bundle.mimeType);
            return bundle.body;
        }
    },

    /**
     * Whether the current member has access to the given book (for the future
     * member-facing download). Returns `{access: boolean}`.
     */
    access: {
        headers: {cacheInvalidate: false},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const memberId = frame.options.context?.member?.id;
            const access = await storefront.hasAccess({memberId, bookId: frame.options.id});
            return {access};
        }
    }
};

module.exports = controller;
