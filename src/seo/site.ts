// Facts about the site that SEO output (meta tags, structured data, sitemap) is built from.
// The public address is not hard-coded: set VITE_SITE_URL (e.g. https://your-domain.com) in the
// hosting environment or in .env.production. Without it, absolute URLs are simply left out.

export const SITE_NAME = 'PaperForge';

export const AUTHOR = {
  name: 'Devesh Tatkare',
  url: 'https://deveshtatkare.com/',
  sameAs: ['https://github.com/devesh-69', 'https://www.linkedin.com/in/deveshtatkare/'],
};

type EnvLike = { VITE_SITE_URL?: string };

/** Public origin without a trailing slash, or '' when not configured. */
export function getSiteUrl(): string {
  const fromVite = (import.meta as unknown as { env?: EnvLike }).env?.VITE_SITE_URL;
  const fromNode = typeof process !== 'undefined' ? process.env?.VITE_SITE_URL : undefined;
  return (fromVite || fromNode || '').replace(/\/+$/, '');
}

/** Absolute URL for a path, or undefined when the site URL is not configured. */
export function absoluteUrl(path: string): string | undefined {
  const base = getSiteUrl();
  return base ? `${base}${path === '/' ? '/' : path}` : undefined;
}
