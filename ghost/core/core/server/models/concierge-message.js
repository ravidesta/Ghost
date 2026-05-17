const ghostBookshelf = require('./base');

const ConciergeMessage = ghostBookshelf.Model.extend({
    tableName: 'concierge_messages',

    hasTimestamps: ['created_at'],

    author() {
        return this.belongsTo('User', 'author_id', 'id');
    }
});

const ConciergeMessages = ghostBookshelf.Collection.extend({
    model: ConciergeMessage
});

module.exports = {
    ConciergeMessage: ghostBookshelf.model('ConciergeMessage', ConciergeMessage),
    ConciergeMessages: ghostBookshelf.collection('ConciergeMessages', ConciergeMessages)
};
