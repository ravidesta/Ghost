const ghostBookshelf = require('./base');

const ServiceOffer = ghostBookshelf.Model.extend({
    tableName: 'service_offers',

    defaults() {
        return {
            status: 'draft',
            currency: 'usd',
            platform_fee_pct: 15
        };
    },

    author() {
        return this.belongsTo('User', 'author_id', 'id');
    },

    provider() {
        return this.belongsTo('User', 'provider_id', 'id');
    },

    book() {
        return this.belongsTo('Book', 'book_id', 'id');
    }
});

const ServiceOffers = ghostBookshelf.Collection.extend({
    model: ServiceOffer
});

module.exports = {
    ServiceOffer: ghostBookshelf.model('ServiceOffer', ServiceOffer),
    ServiceOffers: ghostBookshelf.collection('ServiceOffers', ServiceOffers)
};
