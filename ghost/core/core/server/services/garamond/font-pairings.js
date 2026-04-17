// # Garamond font pairings
//
// Curated pairings for the Garamond editor/reader. Each pairing has a
// deliberately overwrought name so authors feel good about picking one.
//
// Pairings are grouped by mood. Consumers can filter by `group` or pick by
// `id`. Font names match their Google Fonts canonical spelling so they can be
// loaded directly via @fontsource or the Google Fonts CSS API.

/**
 * @typedef {Object} FontPairing
 * @prop {string} id         machine id, e.g. 'the-sorbonne'
 * @prop {string} name       pretentious display name
 * @prop {string} group      'classic' | 'modern' | 'creative'
 * @prop {string} headingFont
 * @prop {string} bodyFont
 * @prop {string} description
 */

/** @type {FontPairing[]} */
const FONT_PAIRINGS = [
    // Classic & Elegant — serif heading + sans body
    {
        id: 'the-florentine',
        name: 'The Florentine',
        group: 'classic',
        headingFont: 'Playfair Display',
        bodyFont: 'Source Sans Pro',
        description: 'High-contrast editorial. For the author who thinks of the page as a frontispiece.'
    },
    {
        id: 'the-baskerville',
        name: 'The Baskerville',
        group: 'classic',
        headingFont: 'Libre Baskerville',
        bodyFont: 'Open Sans',
        description: 'Long-form readability, dressed for a reading. Birmingham by way of Fleet Street.'
    },
    {
        id: 'the-sorbonne',
        name: 'The Sorbonne',
        group: 'classic',
        headingFont: 'EB Garamond',
        bodyFont: 'Lato',
        description: 'Timeless French humanism for modern layouts. The house pairing.'
    },
    {
        id: 'the-athenaeum',
        name: 'The Athenaeum',
        group: 'classic',
        headingFont: 'Merriweather',
        bodyFont: 'Raleway',
        description: 'Safe, modern, versatile. The dark wood and green leather of web typography.'
    },

    // Modern & Punchy — sans heading + display
    {
        id: 'the-bauhaus',
        name: 'The Bauhaus',
        group: 'modern',
        headingFont: 'Oswald',
        bodyFont: 'Montserrat',
        description: 'Geometric, opinionated, load-bearing. For branding that would like to be overheard.'
    },
    {
        id: 'the-bowery',
        name: 'The Bowery',
        group: 'modern',
        headingFont: 'Bebas Neue',
        bodyFont: 'Nunito',
        description: 'Tall condensed titles, soft friendly body. Punk rock on the cover, memoir inside.'
    },
    {
        id: 'the-copenhagen',
        name: 'The Copenhagen',
        group: 'modern',
        headingFont: 'Poppins',
        bodyFont: 'Roboto',
        description: 'Open, clean, professional. Looks like a design system slept in.'
    },
    {
        id: 'the-brutalist',
        name: 'The Brutalist',
        group: 'modern',
        headingFont: 'Montserrat Black',
        bodyFont: 'Raleway',
        description: 'Structure as statement. Heavy headings, airy body — the concrete and the glass.'
    },

    // Creative & Unique
    {
        id: 'the-conde',
        name: 'The Condé',
        group: 'creative',
        headingFont: 'Abril Fatface',
        bodyFont: 'Lato',
        description: 'High-contrast serif that earns the cover. Park Avenue energy.'
    },
    {
        id: 'the-cassini',
        name: 'The Cassini',
        group: 'creative',
        headingFont: 'Space Mono',
        bodyFont: 'Plus Jakarta Sans',
        description: 'Mono title, humanist body. For the essay that thinks it is a transmission.'
    },
    {
        id: 'the-tuileries',
        name: 'The Tuileries',
        group: 'creative',
        headingFont: 'Grand Hotel',
        bodyFont: 'Lato',
        description: 'Scripted flourish over quiet sans. A promenade, not a proclamation.'
    }
];

const BY_ID = Object.fromEntries(FONT_PAIRINGS.map(p => [p.id, p]));

function getPairing(id) {
    return BY_ID[id];
}

function listPairings(group) {
    if (!group) {
        return FONT_PAIRINGS;
    }
    return FONT_PAIRINGS.filter(p => p.group === group);
}

module.exports = {
    FONT_PAIRINGS,
    getPairing,
    listPairings
};
