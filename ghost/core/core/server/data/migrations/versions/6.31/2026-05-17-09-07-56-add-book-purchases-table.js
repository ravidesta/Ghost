const {addTable} = require('../../utils');

module.exports = addTable('book_purchases', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    book_id: {type: 'string', maxlength: 24, nullable: false, references: 'books.id', cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    stripe_payment_intent_id: {type: 'string', maxlength: 255, nullable: true},
    amount_cents: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    currency: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'usd'},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'paid', validations: {isIn: [['paid', 'refunded']]}},
    purchased_at: {type: 'dateTime', nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['member_id', 'book_id'],
        ['book_id', 'status']
    ]
});
