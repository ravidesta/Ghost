const ghostBookshelf = require('./base');

const AuthorMemory = ghostBookshelf.Model.extend({
    tableName: 'author_memory',

    defaults() {
        return {
            source: 'user',
            confidence: 100
        };
    },

    author() {
        return this.belongsTo('User', 'author_id', 'id');
    }
});

const AuthorMemories = ghostBookshelf.Collection.extend({
    model: AuthorMemory
});

module.exports = {
    AuthorMemory: ghostBookshelf.model('AuthorMemory', AuthorMemory),
    AuthorMemories: ghostBookshelf.collection('AuthorMemories', AuthorMemories)
};
