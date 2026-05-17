// # Garamond service
//
// Placeholder entry for the Garamond publishing product (editor modes,
// series-aware catalog tooling, storefront). For now this only exposes the
// font pairing presets — the rest lands as it's built.
const fontPairings = require('./font-pairings');
const importer = require('./importer');
const storefront = require('./storefront');
const packager = require('./packager');
const payments = require('./payments');
const royalties = require('./royalties');
const ai = require('./ai');
const sites = require('./sites');

module.exports = {
    fontPairings,
    importer,
    storefront,
    packager,
    payments,
    royalties,
    ai,
    sites
};
