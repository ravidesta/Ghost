const ghostBookshelf = require('./base');

const Series = ghostBookshelf.Model.extend({
    tableName: 'series',

    defaults() {
        return {
            bundle_discount_pct: 30
        };
    },

    books() {
        return this.hasMany('Book', 'series_id', 'id');
    }
});

const SeriesCollection = ghostBookshelf.Collection.extend({
    model: Series
});

module.exports = {
    Series: ghostBookshelf.model('Series', Series),
    SeriesCollection: ghostBookshelf.collection('SeriesCollection', SeriesCollection)
};
