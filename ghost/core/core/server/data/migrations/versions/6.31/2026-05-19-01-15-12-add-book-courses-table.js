const {addTable} = require('../../utils');

module.exports = addTable('book_courses', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    book_id: {type: 'string', maxlength: 24, nullable: false, references: 'books.id', cascadeDelete: true},
    title: {type: 'string', maxlength: 191, nullable: false},
    description: {type: 'text', maxlength: 65535, nullable: true},
    structure: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'draft', validations: {isIn: [['draft', 'published', 'archived']]}},
    price_cents: {type: 'integer', nullable: true, unsigned: true},
    generated_by_model: {type: 'string', maxlength: 100, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['book_id'],
        ['status']
    ]
});
