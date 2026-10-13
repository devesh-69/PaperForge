import { absoluteUrl, AUTHOR, SITE_NAME } from './site';
import { PUBLIC_PAGES, type PublicPage } from './pages';

export interface HeadTag {
  /** "name" or "property" attribute of a <meta>, or "rel" of a <link> */
  tag: 'meta' | 'link';
  attrs: Record<string, string>;
}

export interface HeadData {
  title: string;
  tags: HeadTag[];
  jsonLd: object[];
}

const OG_IMAGE_PATH = '/paperforge-1024x1024.webp';

function webApplication(page: PublicPage): object {
  const url = absoluteUrl(page.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: page.kind === 'tool' ? `${SITE_NAME} ${page.label}` : SITE_NAME,
    ...(url ? { url } : {}),
    description: page.description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (runs in a web browser)',
    browserRequirements: 'Requires JavaScript and a modern web browser',
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    ...(page.features ? { featureList: page.features } : {}),
    creator: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url, sameAs: AUTHOR.sameAs },
  };
}

function breadcrumb(page: PublicPage): object | null {
  if (page.path === '/') return null;
  const items = [{ name: 'Home', path: '/' }, { name: page.label, path: page.path }];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => {
      const url = absoluteUrl(it.path);
      return { '@type': 'ListItem', position: i + 1, name: it.name, ...(url ? { item: url } : {}) };
    }),
  };
}

function faqPage(page: PublicPage): object | null {
  if (!page.faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/** Everything that belongs in <head> for a public page (used for the prerendered HTML and for client-side navigation). */
export function buildHead(page: PublicPage): HeadData {
  const url = absoluteUrl(page.path);
  const image = absoluteUrl(OG_IMAGE_PATH);
  const tags: HeadTag[] = [
    { tag: 'meta', attrs: { name: 'description', content: page.description } },
    { tag: 'meta', attrs: { name: 'robots', content: 'index,follow,max-image-preview:large' } },
    { tag: 'meta', attrs: { property: 'og:type', content: page.kind === 'landing' ? 'website' : 'article' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE_NAME } },
    { tag: 'meta', attrs: { property: 'og:title', content: page.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: page.description } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: page.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: page.description } },
  ];
  if (url) {
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: url } }, { tag: 'meta', attrs: { property: 'og:url', content: url } });
  }
  if (image) {
    tags.push({ tag: 'meta', attrs: { property: 'og:image', content: image } }, { tag: 'meta', attrs: { name: 'twitter:image', content: image } });
  }
  const jsonLd = [webApplication(page), breadcrumb(page), faqPage(page)].filter((x): x is object => x !== null);
  return { title: page.title, tags, jsonLd };
}

/** URLs for the sitemap (only when a site URL is configured). */
export function sitemapEntries(): { loc: string; priority: string }[] {
  return PUBLIC_PAGES.flatMap((p) => {
    const loc = absoluteUrl(p.path);
    return loc ? [{ loc, priority: p.path === '/' ? '1.0' : p.kind === 'tool' ? '0.8' : '0.4' }] : [];
  });
}
