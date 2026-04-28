import {cn} from '@/lib/utils';
import {
    type CSSProperties,
    type ReactNode,
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import {
    DEFAULT_PAIRING_ID,
    type FontPairing,
    FONT_PAIRINGS,
    getPairing,
    googleFontsUrl
} from './font-pairings';

export type ReaderMode = 'light' | 'dark' | 'zen' | 'editor';
export type ReaderPalette = 'sepia' | 'cream' | 'tan' | 'midnight' | 'blue';
export type ReaderFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type ReaderDensity = 'compact' | 'normal' | 'airy';

export interface GaramondReaderProps {
    children: ReactNode;
    mode?: ReaderMode;
    palette?: ReaderPalette;
    fontPairingId?: string;
    fontSize?: ReaderFontSize;
    density?: ReaderDensity;
    showControls?: boolean;
    onModeChange?: (mode: ReaderMode) => void;
    onPaletteChange?: (palette: ReaderPalette) => void;
    onFontPairingChange?: (id: string) => void;
    className?: string;
}

interface PaletteTokens {
    bg: string;
    fg: string;
    accent: string;
    rule: string;
}

const PALETTES: Record<ReaderPalette, PaletteTokens> = {
    // Light: sepia ink on cream paper
    cream: {bg: '#F4ECD8', fg: '#5B4636', accent: '#8B5E3C', rule: '#D9CDB4'},
    sepia: {bg: '#E9DEC2', fg: '#3E2C1C', accent: '#6B4423', rule: '#C9B791'},
    tan:   {bg: '#D9C7A2', fg: '#3A2E1F', accent: '#5C4326', rule: '#B59E73'},
    // Dark: cream ink on sepia (the inverse, per the Garamond spec)
    midnight: {bg: '#15171A', fg: '#E9DEC2', accent: '#D9CDB4', rule: '#2E3338'},
    // "Light blue on blue" reading mode
    blue:  {bg: '#0F2235', fg: '#A9C4E0', accent: '#7FA8D6', rule: '#1F3D5A'}
};

const FONT_SIZES: Record<ReaderFontSize, string> = {
    sm: '16px',
    md: '18px',
    lg: '20px',
    xl: '22px'
};

const DENSITY_LINE_HEIGHTS: Record<ReaderDensity, number> = {
    compact: 1.45,
    normal: 1.7,
    airy: 1.95
};

const DENSITY_PARAGRAPH_SPACING: Record<ReaderDensity, string> = {
    compact: '0.75em',
    normal: '1.1em',
    airy: '1.6em'
};

const MODE_DEFAULT_PALETTE: Record<ReaderMode, ReaderPalette> = {
    light: 'cream',
    dark: 'midnight',
    zen: 'midnight',
    editor: 'cream'
};

interface TocEntry {
    id: string;
    text: string;
    level: 1 | 2 | 3;
}

function ensureGoogleFontsLoaded(pairing: FontPairing) {
    if (typeof document === 'undefined') {
        return;
    }
    const href = googleFontsUrl(pairing);
    const id = `garamond-reader-fonts-${pairing.id}`;
    if (document.getElementById(id)) {
        return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.id = id;
    document.head.appendChild(link);
}

const GaramondReader = forwardRef<HTMLDivElement, GaramondReaderProps>(
    (
        {
            children,
            mode: modeProp,
            palette: paletteProp,
            fontPairingId: pairingProp,
            fontSize: sizeProp,
            density: densityProp,
            showControls = true,
            onModeChange,
            onPaletteChange,
            onFontPairingChange,
            className
        },
        ref
    ) => {
        const [mode, setMode] = useState<ReaderMode>(modeProp ?? 'light');
        const [palette, setPalette] = useState<ReaderPalette>(
            paletteProp ?? MODE_DEFAULT_PALETTE[modeProp ?? 'light']
        );
        const [pairingId, setPairingId] = useState<string>(pairingProp ?? DEFAULT_PAIRING_ID);
        const [fontSize, setFontSize] = useState<ReaderFontSize>(sizeProp ?? 'md');
        const [density, setDensity] = useState<ReaderDensity>(densityProp ?? 'normal');
        const [toc, setToc] = useState<TocEntry[]>([]);
        const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
        const [zenFocusIndex, setZenFocusIndex] = useState<number | null>(null);

        const contentRef = useRef<HTMLDivElement>(null);

        const pairing = useMemo(() => getPairing(pairingId) ?? getPairing(DEFAULT_PAIRING_ID)!, [pairingId]);

        const handleModeChange = useCallback(
            (next: ReaderMode) => {
                setMode(next);
                // Mode changes pull the palette along unless the user explicitly overrode it.
                if (!paletteProp) {
                    setPalette(MODE_DEFAULT_PALETTE[next]);
                }
                onModeChange?.(next);
            },
            [onModeChange, paletteProp]
        );

        const handlePaletteChange = useCallback(
            (next: ReaderPalette) => {
                setPalette(next);
                onPaletteChange?.(next);
            },
            [onPaletteChange]
        );

        const handlePairingChange = useCallback(
            (next: string) => {
                setPairingId(next);
                onFontPairingChange?.(next);
            },
            [onFontPairingChange]
        );

        useEffect(() => {
            ensureGoogleFontsLoaded(pairing);
        }, [pairing]);

        // Editor mode: derive a TOC from h1/h2/h3 in the rendered content.
        useEffect(() => {
            if (mode !== 'editor') {
                return;
            }
            const root = contentRef.current;
            if (!root) {
                return;
            }
            const headings = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3'));
            const entries: TocEntry[] = headings.map((el, idx) => {
                if (!el.id) {
                    el.id = `garamond-reader-h-${idx}`;
                }
                const level = (Number(el.tagName.slice(1)) as 1 | 2 | 3);
                return {id: el.id, text: el.textContent ?? '', level};
            });
            setToc(entries);

            const observer = new IntersectionObserver(
                (records) => {
                    const hit = records.find(r => r.isIntersecting);
                    if (hit) {
                        setActiveHeadingId(hit.target.id);
                    }
                },
                {rootMargin: '0px 0px -70% 0px', threshold: 0.1}
            );
            headings.forEach(h => observer.observe(h));
            return () => observer.disconnect();
        }, [mode, children]);

        // Zen mode: dim every paragraph except the one closest to viewport center.
        useEffect(() => {
            if (mode !== 'zen') {
                setZenFocusIndex(null);
                return;
            }
            const root = contentRef.current;
            if (!root) {
                return;
            }
            const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p, h1, h2, h3, blockquote, li'));
            paragraphs.forEach((el, idx) => {
                el.dataset.zenIndex = String(idx);
            });

            const observer = new IntersectionObserver(
                (records) => {
                    let bestIdx: number | null = null;
                    let bestRatio = 0;
                    for (const r of records) {
                        if (r.intersectionRatio > bestRatio) {
                            bestRatio = r.intersectionRatio;
                            const idxStr = (r.target as HTMLElement).dataset.zenIndex;
                            bestIdx = idxStr ? Number(idxStr) : null;
                        }
                    }
                    if (bestIdx !== null) {
                        setZenFocusIndex(bestIdx);
                    }
                },
                {threshold: [0.25, 0.5, 0.75, 1], rootMargin: '-30% 0px -30% 0px'}
            );
            paragraphs.forEach(p => observer.observe(p));
            return () => observer.disconnect();
        }, [mode, children]);

        const tokens = PALETTES[palette];
        const styleVars: CSSProperties & Record<string, string> = {
            '--gr-bg': tokens.bg,
            '--gr-fg': tokens.fg,
            '--gr-accent': tokens.accent,
            '--gr-rule': tokens.rule,
            '--gr-heading-font': `'${pairing.headingFont}', serif`,
            '--gr-body-font': `'${pairing.bodyFont}', system-ui, sans-serif`,
            '--gr-font-size': FONT_SIZES[fontSize],
            '--gr-line-height': String(DENSITY_LINE_HEIGHTS[density]),
            '--gr-paragraph-spacing': DENSITY_PARAGRAPH_SPACING[density]
        };

        const isEditor = mode === 'editor';

        return (
            <div
                ref={ref}
                className={cn(
                    'garamond-reader relative isolate min-h-screen w-full transition-colors',
                    className
                )}
                data-mode={mode}
                data-palette={palette}
                style={styleVars}
            >
                <ReaderStyles />

                {showControls && (
                    <ReaderControls
                        mode={mode}
                        palette={palette}
                        pairingId={pairingId}
                        fontSize={fontSize}
                        density={density}
                        onModeChange={handleModeChange}
                        onPaletteChange={handlePaletteChange}
                        onPairingChange={handlePairingChange}
                        onFontSizeChange={setFontSize}
                        onDensityChange={setDensity}
                    />
                )}

                <div
                    className='grid w-full'
                    style={{gridTemplateColumns: isEditor ? 'minmax(220px, 280px) 1fr' : '1fr'}}
                >
                    {isEditor && (
                        <aside className='garamond-reader__chapters border-r'>
                            <div className='sticky top-0 max-h-screen overflow-y-auto p-6'>
                                <p className='garamond-reader__chapters-label'>Chapters</p>
                                <nav className='mt-3 flex flex-col gap-1'>
                                    {toc.length === 0 && (
                                        <span className='garamond-reader__chapters-empty'>No headings yet.</span>
                                    )}
                                    {toc.map(entry => (
                                        <a
                                            key={entry.id}
                                            className={cn(
                                                'garamond-reader__chapter-link',
                                                entry.level === 2 && 'pl-3',
                                                entry.level === 3 && 'pl-6',
                                                activeHeadingId === entry.id && 'is-active'
                                            )}
                                            href={`#${entry.id}`}
                                        >
                                            {entry.text}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </aside>
                    )}

                    <article
                        ref={contentRef}
                        className={cn(
                            'garamond-reader__article',
                            mode === 'zen' && 'garamond-reader__article--zen'
                        )}
                        data-zen-focus={zenFocusIndex ?? undefined}
                    >
                        {children}
                    </article>
                </div>
            </div>
        );
    }
);
GaramondReader.displayName = 'GaramondReader';

interface ReaderControlsProps {
    mode: ReaderMode;
    palette: ReaderPalette;
    pairingId: string;
    fontSize: ReaderFontSize;
    density: ReaderDensity;
    onModeChange: (mode: ReaderMode) => void;
    onPaletteChange: (palette: ReaderPalette) => void;
    onPairingChange: (id: string) => void;
    onFontSizeChange: (size: ReaderFontSize) => void;
    onDensityChange: (density: ReaderDensity) => void;
}

function ReaderControls({
    mode,
    palette,
    pairingId,
    fontSize,
    density,
    onModeChange,
    onPaletteChange,
    onPairingChange,
    onFontSizeChange,
    onDensityChange
}: ReaderControlsProps) {
    return (
        <div className='garamond-reader__controls'>
            <div className='garamond-reader__control-group'>
                {(['light', 'dark', 'zen', 'editor'] as ReaderMode[]).map(m => (
                    <button
                        key={m}
                        className={cn('garamond-reader__pill', mode === m && 'is-active')}
                        type='button'
                        onClick={() => onModeChange(m)}
                    >
                        {m === 'zen' ? 'Garamond' : m[0].toUpperCase() + m.slice(1)}
                    </button>
                ))}
            </div>

            <div className='garamond-reader__control-group'>
                {(['cream', 'sepia', 'tan', 'midnight', 'blue'] as ReaderPalette[]).map(p => (
                    <button
                        key={p}
                        aria-label={`Palette: ${p}`}
                        className={cn('garamond-reader__swatch', palette === p && 'is-active')}
                        data-palette={p}
                        type='button'
                        onClick={() => onPaletteChange(p)}
                    />
                ))}
            </div>

            <select
                className='garamond-reader__select'
                value={pairingId}
                onChange={e => onPairingChange(e.target.value)}
            >
                {FONT_PAIRINGS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>

            <div className='garamond-reader__control-group'>
                {(['sm', 'md', 'lg', 'xl'] as ReaderFontSize[]).map(s => (
                    <button
                        key={s}
                        className={cn('garamond-reader__pill', fontSize === s && 'is-active')}
                        type='button'
                        onClick={() => onFontSizeChange(s)}
                    >
                        A<span style={{fontSize: s === 'sm' ? '0.75em' : s === 'md' ? '0.9em' : s === 'lg' ? '1.05em' : '1.2em'}}>a</span>
                    </button>
                ))}
            </div>

            <div className='garamond-reader__control-group'>
                {(['compact', 'normal', 'airy'] as ReaderDensity[]).map(d => (
                    <button
                        key={d}
                        className={cn('garamond-reader__pill', density === d && 'is-active')}
                        type='button'
                        onClick={() => onDensityChange(d)}
                    >
                        {d}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Scoped styles. We keep these inline so the component is drop-in usable
// without any host-app CSS pipeline changes.
function ReaderStyles() {
    return (
        <style>{`
            .garamond-reader {
                background: var(--gr-bg);
                color: var(--gr-fg);
                font-family: var(--gr-body-font);
                font-size: var(--gr-font-size);
                line-height: var(--gr-line-height);
            }
            .garamond-reader__article {
                max-width: 68ch;
                margin: 0 auto;
                padding: 4rem 2rem 8rem;
            }
            .garamond-reader__article > * + * {
                margin-top: var(--gr-paragraph-spacing);
            }
            .garamond-reader__article h1,
            .garamond-reader__article h2,
            .garamond-reader__article h3 {
                font-family: var(--gr-heading-font);
                color: var(--gr-fg);
                line-height: 1.15;
                margin-top: 1.6em;
            }
            .garamond-reader__article h1 { font-size: 2.4em; letter-spacing: -0.01em; }
            .garamond-reader__article h2 { font-size: 1.8em; }
            .garamond-reader__article h3 { font-size: 1.35em; }
            .garamond-reader__article p:first-of-type::first-letter {
                font-family: var(--gr-heading-font);
                font-size: 3.6em;
                float: left;
                line-height: 0.9;
                padding: 0.05em 0.08em 0 0;
                color: var(--gr-accent);
            }
            .garamond-reader__article blockquote {
                border-left: 3px solid var(--gr-accent);
                padding-left: 1em;
                font-style: italic;
                color: var(--gr-accent);
            }
            .garamond-reader__article a {
                color: var(--gr-accent);
                text-decoration: underline;
                text-underline-offset: 0.2em;
            }
            .garamond-reader__article hr {
                border: 0;
                text-align: center;
                margin: 2.5em 0;
            }
            .garamond-reader__article hr::before {
                content: '· · ·';
                letter-spacing: 0.6em;
                color: var(--gr-rule);
            }

            /* Zen mode: dim everything but the focused paragraph. */
            .garamond-reader__article--zen p,
            .garamond-reader__article--zen h1,
            .garamond-reader__article--zen h2,
            .garamond-reader__article--zen h3,
            .garamond-reader__article--zen blockquote,
            .garamond-reader__article--zen li {
                opacity: 0.4;
                transition: opacity 220ms ease;
            }
            .garamond-reader__article--zen p[data-zen-index]:hover,
            .garamond-reader__article--zen [data-zen-focus] [data-zen-index] {
                /* fallback: hover lifts opacity if scroll tracker hasn't kicked in */
                opacity: 1;
            }

            .garamond-reader__chapters {
                border-color: var(--gr-rule);
                background: color-mix(in oklab, var(--gr-bg) 92%, var(--gr-fg) 8%);
            }
            .garamond-reader__chapters-label {
                font-family: var(--gr-heading-font);
                font-size: 0.8em;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: var(--gr-accent);
            }
            .garamond-reader__chapters-empty {
                opacity: 0.6;
                font-size: 0.9em;
            }
            .garamond-reader__chapter-link {
                display: block;
                font-size: 0.95em;
                padding: 0.25em 0.5em;
                border-radius: 6px;
                color: var(--gr-fg);
                text-decoration: none;
                opacity: 0.75;
                line-height: 1.35;
            }
            .garamond-reader__chapter-link:hover { opacity: 1; }
            .garamond-reader__chapter-link.is-active {
                opacity: 1;
                background: color-mix(in oklab, var(--gr-bg) 60%, var(--gr-accent) 40%);
                color: var(--gr-bg);
            }

            .garamond-reader__controls {
                position: sticky;
                top: 0;
                z-index: 10;
                display: flex;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                background: color-mix(in oklab, var(--gr-bg) 88%, transparent);
                backdrop-filter: blur(6px);
                border-bottom: 1px solid var(--gr-rule);
                flex-wrap: wrap;
                align-items: center;
            }
            .garamond-reader__control-group {
                display: inline-flex;
                gap: 0.25rem;
                background: color-mix(in oklab, var(--gr-bg) 80%, var(--gr-fg) 20%);
                padding: 0.2rem;
                border-radius: 999px;
            }
            .garamond-reader__pill {
                font-family: var(--gr-body-font);
                font-size: 0.85em;
                padding: 0.25rem 0.7rem;
                border-radius: 999px;
                color: var(--gr-fg);
                background: transparent;
                border: 0;
                cursor: pointer;
                opacity: 0.7;
            }
            .garamond-reader__pill:hover { opacity: 1; }
            .garamond-reader__pill.is-active {
                background: var(--gr-accent);
                color: var(--gr-bg);
                opacity: 1;
            }
            .garamond-reader__swatch {
                width: 1.4rem;
                height: 1.4rem;
                border-radius: 999px;
                border: 2px solid transparent;
                cursor: pointer;
            }
            .garamond-reader__swatch[data-palette="cream"]    { background: #F4ECD8; }
            .garamond-reader__swatch[data-palette="sepia"]    { background: #E9DEC2; }
            .garamond-reader__swatch[data-palette="tan"]      { background: #D9C7A2; }
            .garamond-reader__swatch[data-palette="midnight"] { background: #15171A; }
            .garamond-reader__swatch[data-palette="blue"]     { background: #0F2235; }
            .garamond-reader__swatch.is-active {
                border-color: var(--gr-accent);
                box-shadow: 0 0 0 2px var(--gr-bg) inset;
            }
            .garamond-reader__select {
                font-family: var(--gr-body-font);
                font-size: 0.85em;
                padding: 0.25rem 0.5rem;
                border-radius: 999px;
                background: color-mix(in oklab, var(--gr-bg) 80%, var(--gr-fg) 20%);
                color: var(--gr-fg);
                border: 0;
            }
        `}</style>
    );
}

export {GaramondReader};
