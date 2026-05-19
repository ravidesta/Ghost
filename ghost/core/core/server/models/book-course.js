const ghostBookshelf = require('./base');

const BookCourse = ghostBookshelf.Model.extend({
    tableName: 'book_courses',

    defaults() {
        return {status: 'draft'};
    },

    book() {
        return this.belongsTo('Book', 'book_id', 'id');
    },

    /**
     * The structure column is JSON serialized as a string; this getter
     * decodes it so callers can work with the object directly.
     */
    parsedStructure() {
        const raw = this.get('structure');
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
});

const BookCourses = ghostBookshelf.Collection.extend({
    model: BookCourse
});

module.exports = {
    BookCourse: ghostBookshelf.model('BookCourse', BookCourse),
    BookCourses: ghostBookshelf.collection('BookCourses', BookCourses)
};
