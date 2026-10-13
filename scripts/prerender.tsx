// Build step that runs after `vite build`: turns the public pages into real static HTML so
// search engines (and anyone without JavaScript) get full content, structured data and meta
// tags, and writes robots.txt, sitemap.xml, llms.txt and the app shell (app.html).
//
// Made by Devesh Tatkare · deveshtatkare.com

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { loadEnv } from 'vite';

const root = process.cwd();
Object.assign(process.env, loadEnv('production', root, 'VITE_'));

// imported after the environment is set so the site URL is picked up
const { PublicLayout } = await import('../src/components/public/PublicLayout');
const { PublicPageView } = await import('../src/components/public/PublicPageView');
const { PUBLIC_PAGES } = await import('../src/seo/pages');
const { buildHead, sitemapEntries } = await import('../src/seo/head');
const { getSiteUrl, SITE_NAME, AUTHOR } = await import('../src/seo/site');
type HeadData = ReturnType<typeof buildHead>;

const dist = path.join(root, 'dist');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--seo-head-->') || !template.includes('<div id="root"></div>')) {
  throw new Error('dist/index.html is missing the <!--seo-head--> marker or the empty #root; check index.html.');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const renderTag = ({ tag, attrs }: HeadData['tags'][number]) =>
  `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')} />`;
const renderLd = (o: object) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

function build(head: HeadData | null, rootHtml: string, extraHead = ''): string {
  let out = template;
  if (head) {
    out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(head.title)}</title>`);
    out = out.replace(/<meta name="description"[^>]*>\s*/, '');
  }
  const tags = head ? [...head.tags.map(renderTag), ...head.jsonLd.map(renderLd)].join('\n    ') : '';
  out = out.replace('<!--seo-head-->', [tags, extraHead].filter(Boolean).join('\n    '));
  return out.replace('<div id="root"></div>', `<div id="root">${rootHtml}</div>`);
}

function write(relative: string, content: string) {
  const file = path.join(dist, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`  wrote ${path.relative(root, file)}`);
}

// 1. public pages -> static HTML (the landing page replaces dist/index.html)
for (const page of PUBLIC_PAGES) {
  const markup = renderToString(
    <StaticRouter location={page.path}>
      <PublicLayout>
        <PublicPageView page={page} />
      </PublicLayout>
    </StaticRouter>,
  );
  write(page.path === '/' ? 'index.html' : path.join(page.path, 'index.html'), build(buildHead(page), markup));
}

// 2. the app shell, served for every private route; never indexed
write('app.html', build(null, '', '<meta name="robots" content="noindex,nofollow" />'));

// 3. robots.txt
const site = getSiteUrl();
const privateRoutes = ['/home', '/templates', '/question-sets', '/question-set', '/new-question-set', '/letterheads', '/letters', '/exam-papers', '/papers', '/backup'];
write(
  'robots.txt',
  ['User-agent: *', 'Allow: /', ...privateRoutes.map((r) => `Disallow: ${r}`), ...(site ? ['', `Sitemap: ${site}/sitemap.xml`] : []), ''].join('\n'),
);

// 4. sitemap.xml and llms.txt need absolute URLs
if (site) {
  const urls = sitemapEntries().map((e) => `  <url><loc>${esc(e.loc)}</loc><priority>${e.priority}</priority></url>`).join('\n');
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  const lines = PUBLIC_PAGES.map((p) => `- [${p.label}](${site}${p.path}): ${p.description}`);
  write('llms.txt', `# ${SITE_NAME}\n\n> Free, browser-based question paper, letterhead and exam paper maker. Data stays on the user's computer. Created by ${AUTHOR.name} (${AUTHOR.url}).\n\n## Pages\n\n${lines.join('\n')}\n`);
} else {
  console.warn('\n  ! VITE_SITE_URL is not set: canonical URLs, sitemap.xml and llms.txt were skipped.\n    Set it (for example in .env.production) to the public address, then build again.\n');
}
console.log('prerender done');
