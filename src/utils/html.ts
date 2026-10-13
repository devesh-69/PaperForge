// Safe HTML helpers. Rich-text HTML is parsed with DOMParser, which builds an
// inert document: scripts never run and <img> elements never start loading,
// unlike assigning to `innerHTML` on a detached element of the live document.

export function parseHtml(html: string): HTMLElement {
  return new DOMParser().parseFromString(html ?? '', 'text/html').body;
}

export function htmlToText(html: string): string {
  return parseHtml(html).textContent?.trim() ?? '';
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain text (e.g. a spreadsheet cell) -> safe HTML. Blank lines split paragraphs. */
export function textToHtml(text: string | undefined | null): string {
  const t = (text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!t) return '';
  return t
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
