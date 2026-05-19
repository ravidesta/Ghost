const {addPermissionWithRoles} = require('../../utils');

// Foundation for flipping the Garamond admin endpoints from
// `permissions: false` to a real permission check. This is a single
// "manage" action on a `garamond` object type — every Garamond admin
// API surface (books, series, sites, payouts, concierge, courses,
// marketplace) gates on it. Owner + Administrator get it on every
// install via this migration plus the fixtures entry; staff and
// authors get it explicitly per-install for now.
//
// Flipping the controllers themselves is intentionally a separate
// follow-up so the permission row is in place across upgraded sites
// before we start checking for it.
module.exports = addPermissionWithRoles({
    name: 'Manage Garamond',
    action_type: 'manage',
    object_type: 'garamond'
}, ['Administrator', 'Owner']);
