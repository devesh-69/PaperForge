/** Normalises "#abc" / "abc" / "#AABBCC" to "#aabbcc". Returns null when invalid. */
export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return '#' + s.split('').map((c) => c + c).join('').toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
  return null;
}

/** Converts a CSS colour ("#abc", "rgb(1, 2, 3)") to "#rrggbb"; undefined when it is not one we understand. */
export function cssColorToHex(value: string | null | undefined): string | undefined {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  const direct = normalizeHex(v);
  if (direct) return direct;
  const m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(v);
  if (!m) return undefined;
  const to = (n: string) => Math.min(255, Number(n)).toString(16).padStart(2, '0');
  return `#${to(m[1])}${to(m[2])}${to(m[3])}`;
}

/** docx wants colours without the leading '#'. */
export function docxColor(hex: string): string {
  return (normalizeHex(hex) ?? '#000000').slice(1).toUpperCase();
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = normalizeHex(hex) ?? '#000000';
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours (1 … 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
