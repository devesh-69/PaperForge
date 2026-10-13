import { buildHead } from './head';
import type { PublicPage } from './pages';

const MANAGED = 'data-seo';

/**
 * Updates <title>, meta tags and structured data in the live document after a client-side
 * navigation to a public page. (The first load already has them: they are in the prerendered HTML.)
 */
export function applyHead(page: PublicPage): void {
  const head = buildHead(page);
  document.title = head.title;

  // replace tags we added earlier, and any static ones with the same identity
  document.head.querySelectorAll(`[${MANAGED}]`).forEach((n) => n.remove());
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((n) => n.remove());
  const identity = (a: Record<string, string>) => a.name ?? a.property ?? a.rel;
  head.tags.forEach(({ tag, attrs }) => {
    const key = identity(attrs);
    const attr = attrs.name ? 'name' : attrs.property ? 'property' : 'rel';
    document.head.querySelectorAll(`${tag}[${attr}="${key}"]`).forEach((n) => n.remove());
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    el.setAttribute(MANAGED, '1');
    document.head.appendChild(el);
  });
  head.jsonLd.forEach((obj) => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute(MANAGED, '1');
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  });
}
