const ghostBookshelf = require('./base');

const BookPurchase = ghostBookshelf.Model.extend({
    tableName: 'book_purchases',

    defaults() {
        return {
            status: 'paid',
            currency: 'usd',
            amount_cents: 0
        };
    },

    book() {
        return this.belongsTo('Book', 'book_id', 'id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
});

const BookPurchases = ghostBookshelf.Collection.extend({
    model: BookPurchase
});

module.exports = {
    BookPurchase: ghostBookshelf.model('BookPurchase', BookPurchase),
    BookPurchases: ghostBookshelf.collection('BookPurchases', BookPurchases)
};
