const {addTable} = require('../../utils');

module.exports = addTable('series', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    description: {type: 'text', maxlength: 65535, nullable: true},
    cover_template_id: {type: 'string', maxlength: 24, nullable: true},
    bundle_discount_pct: {type: 'integer', nullable: false, unsigned: true, defaultTo: 30},
    created_at: {type: 'dateTime', nullable: false},
    created_by: {type: 'string', maxlength: 24, nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    updated_by: {type: 'string', maxlength: 24, nullable: true}
});
