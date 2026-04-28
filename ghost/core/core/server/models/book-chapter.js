const ghostBookshelf = require('./base');

const BookChapter = ghostBookshelf.Model.extend({
    tableName: 'book_chapters',

    defaults() {
        return {
            position: 0
        };
    },

    book() {
        return this.belongsTo('Book', 'book_id', 'id');
    }
});

const BookChapters = ghostBookshelf.Collection.extend({
    model: BookChapter
});

module.exports = {
    BookChapter: ghostBookshelf.model('BookChapter', BookChapter),
    BookChapters: ghostBookshelf.collection('BookChapters', BookChapters)
};
