const {addTable} = require('../../utils');

module.exports = addTable('service_offers', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    author_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'},
    provider_id: {type: 'string', maxlength: 24, nullable: true, references: 'users.id'},
    book_id: {type: 'string', maxlength: 24, nullable: true, references: 'books.id'},
    kind: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['edit', 'proofread', 'illustration', 'cover', 'formatting', 'other']]}},
    title: {type: 'string', maxlength: 191, nullable: false},
    description: {type: 'text', maxlength: 65535, nullable: true},
    budget_cents: {type: 'integer', nullable: false, unsigned: true},
    currency: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'usd'},
    platform_fee_pct: {type: 'integer', nullable: false, unsigned: true, defaultTo: 15},
    deadline: {type: 'dateTime', nullable: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'draft', validations: {isIn: [['draft', 'posted', 'claimed', 'in_progress', 'delivered', 'accepted', 'disputed', 'canceled']]}},
    payment_provider: {type: 'string', maxlength: 50, nullable: true},
    funding_reference: {type: 'string', maxlength: 255, nullable: true},
    payout_reference: {type: 'string', maxlength: 255, nullable: true},
    delivery_notes: {type: 'text', maxlength: 65535, nullable: true},
    accepted_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['status', 'kind'],
        ['author_id', 'status'],
        ['provider_id', 'status']
    ]
});
