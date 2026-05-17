const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');

const messages = {
    seriesNotFound: 'Series not found.'
};

// TODO(garamond): swap to `permissions: true` once the populate-permissions
// migration lands.
const PUBLIC = false;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'series',

    browse: {
        headers: {cacheInvalidate: false},
        options: ['filter', 'order', 'page', 'limit', 'include'],
        permissions: PUBLIC,
        query(frame) {
            return models.Series.findPage(frame.options);
        }
    },

    read: {
        headers: {cacheInvalidate: false},
        options: ['include'],
        data: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const model = await models.Series.findOne(frame.data, {
                ...frame.options,
                withRelated: (frame.options.withRelated || []).concat(['books'])
            });
            if (!model) {
                throw new errors.NotFoundError({message: tpl(messages.seriesNotFound)});
            }
            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        permissions: PUBLIC,
        query(frame) {
            return models.Series.add(frame.data.series[0], frame.options);
        }
    },

    edit: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: PUBLIC,
        async query(frame) {
            const model = await models.Series.edit(frame.data.series[0], frame.options);
            if (!model) {
                throw new errors.NotFoundError({message: tpl(messages.seriesNotFound)});
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
            return models.Series.destroy({...frame.options, require: true});
        }
    }
};

module.exports = controller;
