// Remembers that this browser has used the app, so the bare address (the public landing page)
// can send returning users straight to their Home. Search engines never have this flag and
// always get the landing page. If storage is unavailable, everyone simply sees the landing page.

const KEY = 'pf:visited';

export function hasVisited(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function markVisited(): void {
  try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
}
