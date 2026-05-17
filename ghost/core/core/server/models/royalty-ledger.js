const ghostBookshelf = require('./base');

const RoyaltyLedger = ghostBookshelf.Model.extend({
    tableName: 'royalty_ledger',

    defaults() {
        return {
            entry_type: 'sale',
            currency: 'usd',
            payout_status: 'pending',
            gross_cents: 0,
            platform_fee_cents: 0,
            net_cents: 0
        };
    },

    book() {
        return this.belongsTo('Book', 'book_id', 'id');
    },

    author() {
        return this.belongsTo('User', 'author_id', 'id');
    },

    purchase() {
        return this.belongsTo('BookPurchase', 'book_purchase_id', 'id');
    }
});

const RoyaltyLedgers = ghostBookshelf.Collection.extend({
    model: RoyaltyLedger
});

module.exports = {
    RoyaltyLedger: ghostBookshelf.model('RoyaltyLedger', RoyaltyLedger),
    RoyaltyLedgers: ghostBookshelf.collection('RoyaltyLedgers', RoyaltyLedgers)
};
