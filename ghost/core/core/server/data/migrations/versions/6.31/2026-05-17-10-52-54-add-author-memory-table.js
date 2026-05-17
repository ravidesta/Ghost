const {addTable} = require('../../utils');

module.exports = addTable('author_memory', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    author_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'},
    key: {type: 'string', maxlength: 191, nullable: false},
    value: {type: 'text', maxlength: 65535, nullable: true},
    source: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'user', validations: {isIn: [['user', 'inferred', 'event']]}},
    confidence: {type: 'integer', nullable: false, unsigned: true, defaultTo: 100},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['author_id', 'key']
    ]
});
