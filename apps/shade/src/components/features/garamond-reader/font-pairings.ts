// Mirror of the backend Garamond font pairings catalogue. Kept thin so the
// reader stays self-contained — extract to a shared package once Garamond
// has its own.
export type FontPairingGroup = 'classic' | 'modern' | 'creative';

export interface FontPairing {
    id: string;
    name: string;
    group: FontPairingGroup;
    headingFont: string;
    bodyFont: string;
    description: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
    {id: 'the-florentine', name: 'The Florentine', group: 'classic', headingFont: 'Playfair Display', bodyFont: 'Source Sans Pro', description: 'High-contrast editorial. For the author who thinks of the page as a frontispiece.'},
    {id: 'the-baskerville', name: 'The Baskerville', group: 'classic', headingFont: 'Libre Baskerville', bodyFont: 'Open Sans', description: 'Long-form readability, dressed for a reading. Birmingham by way of Fleet Street.'},
    {id: 'the-sorbonne', name: 'The Sorbonne', group: 'classic', headingFont: 'EB Garamond', bodyFont: 'Lato', description: 'Timeless French humanism for modern layouts. The house pairing.'},
    {id: 'the-athenaeum', name: 'The Athenaeum', group: 'classic', headingFont: 'Merriweather', bodyFont: 'Raleway', description: 'Safe, modern, versatile. The dark wood and green leather of web typography.'},
    {id: 'the-bauhaus', name: 'The Bauhaus', group: 'modern', headingFont: 'Oswald', bodyFont: 'Montserrat', description: 'Geometric, opinionated, load-bearing. For branding that would like to be overheard.'},
    {id: 'the-bowery', name: 'The Bowery', group: 'modern', headingFont: 'Bebas Neue', bodyFont: 'Nunito', description: 'Tall condensed titles, soft friendly body. Punk rock on the cover, memoir inside.'},
    {id: 'the-copenhagen', name: 'The Copenhagen', group: 'modern', headingFont: 'Poppins', bodyFont: 'Roboto', description: 'Open, clean, professional. Looks like a design system slept in.'},
    {id: 'the-brutalist', name: 'The Brutalist', group: 'modern', headingFont: 'Montserrat', bodyFont: 'Raleway', description: 'Structure as statement. Heavy headings, airy body — the concrete and the glass.'},
    {id: 'the-conde', name: 'The Condé', group: 'creative', headingFont: 'Abril Fatface', bodyFont: 'Lato', description: 'High-contrast serif that earns the cover. Park Avenue energy.'},
    {id: 'the-cassini', name: 'The Cassini', group: 'creative', headingFont: 'Space Mono', bodyFont: 'Plus Jakarta Sans', description: 'Mono title, humanist body. For the essay that thinks it is a transmission.'},
    {id: 'the-tuileries', name: 'The Tuileries', group: 'creative', headingFont: 'Grand Hotel', bodyFont: 'Lato', description: 'Scripted flourish over quiet sans. A promenade, not a proclamation.'}
];

export const DEFAULT_PAIRING_ID = 'the-sorbonne';

export function getPairing(id: string): FontPairing | undefined {
    return FONT_PAIRINGS.find(p => p.id === id);
}

// Build a Google Fonts CSS URL that loads only the families used by a pairing.
// Browsers dedupe identical <link> elements, so calling this often is cheap.
export function googleFontsUrl(pairing: FontPairing): string {
    const families = new Set([pairing.headingFont, pairing.bodyFont]);
    const params = Array.from(families)
        .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600;700`)
        .join('&');
    return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
