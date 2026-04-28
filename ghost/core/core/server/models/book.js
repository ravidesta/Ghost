const ghostBookshelf = require('./base');

const Book = ghostBookshelf.Model.extend({
    tableName: 'books',

    defaults() {
        return {
            status: 'draft',
            font_pairing_id: 'the-sorbonne'
        };
    },

    author() {
        return this.belongsTo('User', 'author_id', 'id');
    },

    series() {
        return this.belongsTo('Series', 'series_id', 'id');
    },

    chapters() {
        return this.hasMany('BookChapter', 'book_id', 'id');
    }
});

const Books = ghostBookshelf.Collection.extend({
    model: Book
});

module.exports = {
    Book: ghostBookshelf.model('Book', Book),
    Books: ghostBookshelf.collection('Books', Books)
};
