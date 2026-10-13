import type { Script } from './script';

// Fonts embedded in the vector PDF. All are open-licence (SIL OFL / Apache) and metric-compatible
// with the Word fonts they stand in for: Tinos ~ Times New Roman, Arimo ~ Arial, Cousine ~ Courier New.
// Word picks fonts by name on the reader's computer; a PDF must carry its own, so the closest
// generic family is used. The files are fetched only when a PDF is made.

export type Family = 'serif' | 'sans' | 'mono';

const SERIF = new Set(['Times New Roman', 'Cambria', 'Georgia', 'Garamond']);
const MONO = new Set(['Courier New']);

export function familyOf(fontLabel: string): Family {
  if (SERIF.has(fontLabel)) return 'serif';
  if (MONO.has(fontLabel)) return 'mono';
  return 'sans';
}

type Loader = () => Promise<{ default: string }>;

/** key: `${family}-${r|b}${i?}` for Latin; `deva-${serif|sans}-${r|b}` for Devanagari */
const FILES: Record<string, Loader> = {
  'serif-r': () => import('@fontsource/tinos/files/tinos-latin-400-normal.woff?url'),
  'serif-b': () => import('@fontsource/tinos/files/tinos-latin-700-normal.woff?url'),
  'serif-ri': () => import('@fontsource/tinos/files/tinos-latin-400-italic.woff?url'),
  'serif-bi': () => import('@fontsource/tinos/files/tinos-latin-700-italic.woff?url'),
  'sans-r': () => import('@fontsource/arimo/files/arimo-latin-400-normal.woff?url'),
  'sans-b': () => import('@fontsource/arimo/files/arimo-latin-700-normal.woff?url'),
  'sans-ri': () => import('@fontsource/arimo/files/arimo-latin-400-italic.woff?url'),
  'sans-bi': () => import('@fontsource/arimo/files/arimo-latin-700-italic.woff?url'),
  'mono-r': () => import('@fontsource/cousine/files/cousine-latin-400-normal.woff?url'),
  'mono-b': () => import('@fontsource/cousine/files/cousine-latin-700-normal.woff?url'),
  'mono-ri': () => import('@fontsource/cousine/files/cousine-latin-400-italic.woff?url'),
  'mono-bi': () => import('@fontsource/cousine/files/cousine-latin-700-italic.woff?url'),
  'deva-serif-r': () => import('@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-devanagari-400-normal.woff?url'),
  'deva-serif-b': () => import('@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-devanagari-700-normal.woff?url'),
  'deva-sans-r': () => import('@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url'),
  'deva-sans-b': () => import('@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff?url'),
};

export function fontKey(family: Family, script: Script, bold: boolean, italic: boolean): string {
  if (script === 'deva') return `deva-${family === 'serif' ? 'serif' : 'sans'}-${bold ? 'b' : 'r'}`;
  return `${family}-${bold ? 'b' : 'r'}${italic ? 'i' : ''}`;
}

let cache: Promise<Map<string, ArrayBuffer>> | null = null;

/** Downloads (once per page load) every font file. */
export function loadFontFiles(): Promise<Map<string, ArrayBuffer>> {
  cache ??= (async () => {
    const entries = await Promise.all(
      Object.entries(FILES).map(async ([key, load]) => {
        const url = (await load()).default;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Could not load font ${key}`);
        return [key, await res.arrayBuffer()] as const;
      }),
    );
    return new Map(entries);
  })().catch((err) => {
    cache = null; // allow a retry
    throw err;
  });
  return cache;
}
