import { parseHtml } from '../utils/html';

// ── Plain-text check: is rich content effectively empty? ─────────────────────
export function isRichContentEmpty(html: string): boolean {
  const body = parseHtml(html);
  return (body.textContent?.trim() ?? '').length === 0 && body.querySelector('img') === null;
}
