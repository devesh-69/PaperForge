// Which font a piece of text needs. The vector PDF embeds Latin and Devanagari (Hindi, Marathi,
// Sanskrit) fonts; anything else makes the caller fall back to the image-based PDF.
//
// The Devanagari fonts contain only Devanagari letters: not even spaces, digits or punctuation.
// So spaces, digits and punctuation always use the Latin font, even between Hindi words.

export type Script = 'latin' | 'deva';

const DEVA = /[ऀ-ॿ᳐-᳿꣠-ꣿ₹◌]/;
/** the characters the embedded Latin fonts cover (Basic Latin, Latin-1, common punctuation and symbols) */
const LATIN = /[\u0000-ÿıŒœʻʼˆ˚˜ -⁯⁴€™↑↓−∕]/;
/** zero-width joiners belong to the Devanagari letters around them (they shape conjuncts) */
const JOINER = /[‌‍]/;

function scriptOf(ch: string): Script | 'joiner' | 'unsupported' {
  if (DEVA.test(ch)) return 'deva';
  if (JOINER.test(ch)) return 'joiner';
  if (LATIN.test(ch)) return 'latin';
  return 'unsupported';
}

export function isFullySupported(text: string): boolean {
  for (const ch of text) if (scriptOf(ch) === 'unsupported') return false;
  return true;
}

export interface Segment {
  text: string;
  script: Script;
}

/** Splits text into runs that each use one font. */
export function splitScripts(text: string): Segment[] {
  const out: Segment[] = [];
  for (const ch of text) {
    const s = scriptOf(ch);
    const last = out[out.length - 1];
    if (s === 'joiner') {
      if (last) last.text += ch;
      else out.push({ text: ch, script: 'deva' });
      continue;
    }
    const script: Script = s === 'deva' ? 'deva' : 'latin';
    if (last && last.script === script) last.text += ch;
    else out.push({ text: ch, script });
  }
  return out;
}
