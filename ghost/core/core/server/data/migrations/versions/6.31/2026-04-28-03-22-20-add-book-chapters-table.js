const {addTable} = require('../../utils');

module.exports = addTable('book_chapters', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    book_id: {type: 'string', maxlength: 24, nullable: false, references: 'books.id', cascadeDelete: true},
    position: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    title: {type: 'string', maxlength: 191, nullable: true},
    content: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['book_id', 'position']
    ]
});
