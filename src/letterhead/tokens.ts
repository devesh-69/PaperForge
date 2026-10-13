// {Token} placeholders: any text on the letterhead can contain {Month}, {Year},
// {Center} … and the fill-in form asks for one value per distinct token.

const TOKEN_RE = /\{([A-Za-z][A-Za-z0-9 _-]{0,30})\}/g;

export function extractTokens(texts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of texts) {
    for (const m of t.matchAll(TOKEN_RE)) {
      const name = m[1].trim();
      if (!seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  }
  return out;
}

/** Replaces tokens with their values (empty string when not filled in). */
export function fillTokens(text: string, values: Record<string, string>): string {
  return text.replace(TOKEN_RE, (_m, name: string) => (values[name.trim()] ?? '').trim());
}

/** Splits text into plain and token parts, for highlighting unfilled tokens in the preview. */
export function splitTokens(text: string, values: Record<string, string>): { text: string; empty: boolean }[] {
  const parts: { text: string; empty: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx), empty: false });
    const v = (values[m[1].trim()] ?? '').trim();
    parts.push(v ? { text: v, empty: false } : { text: `{${m[1].trim()}}`, empty: true });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), empty: false });
  return parts;
}
