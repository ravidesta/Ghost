const {addTable} = require('../../utils');

module.exports = addTable('concierge_messages', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    author_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'},
    role: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['user', 'assistant', 'system']]}},
    content: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: false},
    token_usage: {type: 'text', maxlength: 65535, nullable: true},
    model: {type: 'string', maxlength: 100, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    '@@INDEXES@@': [
        ['author_id', 'created_at']
    ]
});
