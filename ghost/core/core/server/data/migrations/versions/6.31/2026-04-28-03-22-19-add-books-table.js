const {addTable} = require('../../utils');

module.exports = addTable('books', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    title: {type: 'string', maxlength: 191, nullable: false},
    subtitle: {type: 'string', maxlength: 191, nullable: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    author_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'},
    series_id: {type: 'string', maxlength: 24, nullable: true, references: 'series.id'},
    series_position: {type: 'integer', nullable: true, unsigned: true},
    description: {type: 'text', maxlength: 65535, nullable: true},
    cover_image: {type: 'string', maxlength: 2000, nullable: true},
    font_pairing_id: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'the-sorbonne'},
    format_settings: {type: 'text', maxlength: 65535, nullable: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'draft', validations: {isIn: [['draft', 'published', 'archived']]}},
    price_cents: {type: 'integer', nullable: true, unsigned: true},
    published_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    created_by: {type: 'string', maxlength: 24, nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    updated_by: {type: 'string', maxlength: 24, nullable: true},
    '@@INDEXES@@': [
        ['author_id'],
        ['series_id'],
        ['status']
    ]
});
