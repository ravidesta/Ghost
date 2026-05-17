const {addTable} = require('../../utils');

module.exports = addTable('royalty_ledger', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    book_id: {type: 'string', maxlength: 24, nullable: false, references: 'books.id', cascadeDelete: true},
    author_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'},
    book_purchase_id: {type: 'string', maxlength: 24, nullable: true, references: 'book_purchases.id'},
    entry_type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'sale', validations: {isIn: [['sale', 'refund', 'adjustment']]}},
    gross_cents: {type: 'integer', nullable: false, defaultTo: 0},
    platform_fee_cents: {type: 'integer', nullable: false, defaultTo: 0},
    net_cents: {type: 'integer', nullable: false, defaultTo: 0},
    currency: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'usd'},
    payout_status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending', validations: {isIn: [['pending', 'paid', 'on_hold']]}},
    payout_reference: {type: 'string', maxlength: 255, nullable: true},
    recorded_at: {type: 'dateTime', nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['author_id', 'payout_status'],
        ['book_id'],
        ['book_purchase_id']
    ]
});
